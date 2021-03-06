import {
  decrypt,
  ecCurve,
  EncryptedMessage,
  getPubKeyPoint,
  IMetadata,
  Point,
  Polynomial,
  PolynomialID,
  PublicPolynomial,
  PublicPolynomialMap,
  PublicShare,
  PublicSharePolyIDShareIndexMap,
  Share,
  ShareDescriptionMap,
  ShareMap,
  ShareStore,
  StringifiedType,
  toPrivKeyECC,
} from "@tkey/common-types";
import BN from "bn.js";
import stringify from "json-stable-stringify";

import CoreError from "./errors";
import { polyCommitmentEval } from "./lagrangeInterpolatePolynomial";

class Metadata implements IMetadata {
  pubKey: Point;

  publicPolynomials: PublicPolynomialMap;

  publicShares: PublicSharePolyIDShareIndexMap;

  polyIDList: PolynomialID[];

  generalStore: {
    [moduleName: string]: unknown;
  };

  tkeyStore: {
    [moduleName: string]: unknown;
  };

  scopedStore: {
    [moduleName: string]: unknown;
  };

  nonce: number;

  constructor(input: Point) {
    this.publicPolynomials = {};
    this.publicShares = {};
    this.generalStore = {};
    this.tkeyStore = {};
    this.scopedStore = {};
    this.pubKey = input;
    this.polyIDList = [];
    this.nonce = 0;
  }

  getShareIndexesForPolynomial(polyID: PolynomialID): Array<string> {
    return Object.keys(this.publicShares[polyID]);
  }

  getLatestPublicPolynomial(): PublicPolynomial {
    return this.publicPolynomials[this.polyIDList[this.polyIDList.length - 1]];
  }

  addPublicPolynomial(publicPolynomial: PublicPolynomial): void {
    const polyID = publicPolynomial.getPolynomialID();
    this.publicPolynomials[polyID] = publicPolynomial;
    this.polyIDList.push(polyID);
  }

  addPublicShare(polynomialID: PolynomialID, publicShare: PublicShare): void {
    if (!(polynomialID in this.publicShares)) {
      this.publicShares[polynomialID] = {};
    }
    this.publicShares[polynomialID][publicShare.shareIndex.toString("hex")] = publicShare;
  }

  setGeneralStoreDomain(key: string, obj: unknown): void {
    this.generalStore[key] = obj;
  }

  getGeneralStoreDomain(key: string): unknown {
    return this.generalStore[key];
  }

  setTkeyStoreDomain(key: string, arr: unknown): void {
    this.tkeyStore[key] = arr;
  }

  getTkeyStoreDomain(key: string): unknown {
    return this.tkeyStore[key];
  }

  addFromPolynomialAndShares(polynomial: Polynomial, shares: Share[] | ShareMap): void {
    const publicPolynomial = polynomial.getPublicPolynomial();
    this.addPublicPolynomial(publicPolynomial);
    if (Array.isArray(shares)) {
      for (let i = 0; i < shares.length; i += 1) {
        this.addPublicShare(publicPolynomial.getPolynomialID(), shares[i].getPublicShare());
      }
    } else {
      for (const k in shares) {
        if (Object.prototype.hasOwnProperty.call(shares, k)) {
          this.addPublicShare(publicPolynomial.getPolynomialID(), shares[k].getPublicShare());
        }
      }
    }
  }

  setScopedStore(domain: string, data: unknown): void {
    this.scopedStore[domain] = data;
  }

  async getEncryptedShare(shareStore: ShareStore): Promise<ShareStore> {
    const pubShare = shareStore.share.getPublicShare();
    const encryptedShareStore = this.scopedStore.encryptedShares;
    if (!encryptedShareStore) {
      throw CoreError.encryptedShareStoreUnavailable(`${shareStore}`);
    }
    const encryptedShare = encryptedShareStore[pubShare.shareCommitment.x.toString("hex")];
    if (!encryptedShare) {
      throw CoreError.encryptedShareStoreUnavailable(`${shareStore}`);
    }
    const rawDecrypted = await decrypt(toPrivKeyECC(shareStore.share.share), encryptedShare as EncryptedMessage);
    return ShareStore.fromJSON(JSON.parse(rawDecrypted.toString()));
  }

  getShareDescription(): ShareDescriptionMap {
    return this.getGeneralStoreDomain("shareDescriptions") as ShareDescriptionMap;
  }

  addShareDescription(shareIndex: string, description: string): void {
    const currentSD = this.getGeneralStoreDomain("shareDescriptions") || {};
    if (currentSD[shareIndex]) {
      currentSD[shareIndex].push(description);
    } else {
      currentSD[shareIndex] = [description];
    }
    this.setGeneralStoreDomain("shareDescriptions", currentSD);
  }

  deleteShareDescription(shareIndex: string, description: string): void {
    const currentSD = this.getGeneralStoreDomain("shareDescriptions");
    const index = currentSD[shareIndex].indexOf(description);
    if (index > -1) {
      currentSD[shareIndex].splice(index, 1);
    }
  }

  shareToShareStore(share: BN): ShareStore {
    const pubkey = getPubKeyPoint(share);
    let returnShare: ShareStore;
    Object.keys(this.publicShares).forEach((el) => {
      // eslint-disable-next-line consistent-return
      Object.keys(this.publicShares[el]).forEach((pl) => {
        const pubShare = this.publicShares[el][pl];
        if (pubShare.shareCommitment.x.eq(pubkey.x) && pubShare.shareCommitment.y.eq(pubkey.y)) {
          const tempShare = new Share(pubShare.shareIndex, share);
          returnShare = new ShareStore(tempShare, el);
        }
      });
    });
    if (returnShare) return returnShare;
    throw CoreError.default("Share doesn't exist");
  }

  clone(): Metadata {
    return Metadata.fromJSON(JSON.parse(stringify(this)));
  }

  toJSON(): StringifiedType {
    // squash data to serialized polyID according to spec
    const serializedPolyIDList = [];
    for (let i = 0; i < this.polyIDList.length; i += 1) {
      const polyID = this.polyIDList[i];
      const shareIndexes = Object.keys(this.publicShares[polyID]);
      const sortedShareIndexes = shareIndexes.sort((a: string, b: string) => new BN(a, "hex").cmp(new BN(b, "hex")));
      const serializedPolyID = polyID
        .split(`|`)
        .concat("0x0")
        .concat(...sortedShareIndexes)
        .join("|");
      serializedPolyIDList.push(serializedPolyID);
    }

    return {
      pubKey: this.pubKey.encode("elliptic-compressed", { ec: ecCurve }).toString(),
      polyIDList: serializedPolyIDList,
      scopedStore: this.scopedStore,
      generalStore: this.generalStore,
      tkeyStore: this.tkeyStore,
      nonce: this.nonce,
    };
  }

  static fromJSON(value: StringifiedType): Metadata {
    const { pubKey, polyIDList, generalStore, tkeyStore, scopedStore, nonce } = value;
    const point = Point.fromCompressedPub(pubKey);
    const metadata = new Metadata(point);
    const unserializedPolyIDList = [];

    if (generalStore) metadata.generalStore = generalStore;
    if (tkeyStore) metadata.tkeyStore = tkeyStore;
    if (scopedStore) metadata.scopedStore = scopedStore;
    if (nonce) metadata.nonce = nonce;

    for (let i = 0; i < polyIDList.length; i += 1) {
      const serializedPolyID = polyIDList[i];
      const arrPolyID = serializedPolyID.split("|");
      const firstHalf = arrPolyID.slice(
        0,
        arrPolyID.findIndex((v) => v === "0x0")
      );
      const secondHalf = arrPolyID.slice(arrPolyID.findIndex((v) => v === "0x0") + 1, arrPolyID.length);
      // for publicPolynomials
      const pubPolyID = firstHalf.join("|");
      const pointCommitments = [];
      firstHalf.forEach((compressedCommitment) => {
        pointCommitments.push(Point.fromCompressedPub(compressedCommitment));
      });
      const publicPolynomial = new PublicPolynomial(pointCommitments);
      metadata.publicPolynomials[pubPolyID] = publicPolynomial;

      // for publicShares
      secondHalf.forEach((shareIndex) => {
        const newPubShare = new PublicShare(shareIndex, polyCommitmentEval(publicPolynomial.polynomialCommitments, new BN(shareIndex, "hex")));
        metadata.addPublicShare(pubPolyID, newPubShare);
      });

      // for polyIDList
      unserializedPolyIDList.push(pubPolyID);
    }

    metadata.polyIDList = unserializedPolyIDList;
    return metadata;
  }
}

export default Metadata;
