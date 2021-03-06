/// <reference types="node" />
import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";
import { Point, Polynomial, PublicPolynomial, PublicPolynomialMap, PublicShare, PublicSharePolyIDShareIndexMap, Share, ShareMap, ShareStore, ShareStoreMap, ShareStorePolyIDShareIndexMap } from "../base";
import { BNString, EncryptedMessage, ISerializable, IServiceProvider, IStorageLayer, PolynomialID, ShareDescriptionMap } from "./commonTypes";
export interface IModule {
    moduleName: string;
    setModuleReferences(api: ITKeyApi): void;
    initialize(): Promise<void>;
}
export declare type ModuleMap = {
    [moduleName: string]: IModule;
};
export declare type RefreshMiddlewareMap = {
    [moduleName: string]: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown;
};
export declare type ReconstructKeyMiddlewareMap = {
    [moduleName: string]: () => Promise<BN[]>;
};
export declare type ShareSerializationMiddleware = {
    serialize: (share: BN, type: string) => Promise<unknown>;
    deserialize: (serializedShare: unknown, type: string) => Promise<BN>;
};
export interface IMetadata extends ISerializable {
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
    getShareIndexesForPolynomial(polyID: PolynomialID): string[];
    getLatestPublicPolynomial(): PublicPolynomial;
    addPublicPolynomial(publicPolynomial: PublicPolynomial): void;
    addPublicShare(polynomialID: PolynomialID, publicShare: PublicShare): void;
    setGeneralStoreDomain(key: string, obj: unknown): void;
    getGeneralStoreDomain(key: string): unknown;
    setTkeyStoreDomain(key: string, arr: unknown): void;
    getTkeyStoreDomain(key: string): unknown;
    addFromPolynomialAndShares(polynomial: Polynomial, shares: Array<Share> | ShareMap): void;
    setScopedStore(domain: string, data: unknown): void;
    getEncryptedShare(shareStore: ShareStore): Promise<ShareStore>;
    getShareDescription(): ShareDescriptionMap;
    shareToShareStore(share: BN): ShareStore;
    addShareDescription(shareIndex: string, description: string): void;
    deleteShareDescription(shareIndex: string, description: string): void;
    clone(): IMetadata;
}
export declare type InitializeNewKeyResult = {
    privKey: BN;
    deviceShare?: ShareStore;
    userShare?: ShareStore;
};
export declare type ReconstructedKeyResult = {
    privKey: BN;
    seedPhrase?: BN[];
    allKeys?: BN[];
};
export declare type CatchupToLatestShareResult = {
    latestShare: ShareStore;
    shareMetadata: IMetadata;
};
export declare type GenerateNewShareResult = {
    newShareStores: ShareStoreMap;
    newShareIndex: BN;
};
export declare type DeleteShareResult = {
    newShareStores: ShareStoreMap;
};
export declare type RefreshSharesResult = {
    shareStores: ShareStoreMap;
};
export declare type KeyDetails = {
    pubKey: Point;
    requiredShares: number;
    threshold: number;
    totalShares: number;
    shareDescriptions: ShareDescriptionMap;
    modules: ModuleMap;
};
export declare type TKeyArgs = {
    enableLogging?: boolean;
    modules?: ModuleMap;
    serviceProvider?: IServiceProvider;
    storageLayer?: IStorageLayer;
    directParams?: DirectWebSDKArgs;
};
export interface SecurityQuestionStoreArgs {
    nonce: BNString;
    shareIndex: BNString;
    sqPublicShare: PublicShare;
    polynomialID: PolynomialID;
    questions: string;
}
export interface TkeyStoreDataArgs {
    [key: string]: unknown;
}
export interface TkeyStoreArgs {
    data: TkeyStoreDataArgs;
}
export interface ShareTransferStorePointerArgs {
    pointer: BNString;
}
export declare type BufferObj = {
    type: string;
    data: number[];
};
export interface ShareRequestArgs {
    encPubKey: unknown;
    encShareInTransit: EncryptedMessage;
    availableShareIndexes: string[];
    userAgent: string;
    timestamp: number;
}
export declare type TkeyStoreItemType = {
    id: string;
    type: string;
};
export declare type ISeedPhraseStore = TkeyStoreItemType & {
    seedPhrase: string;
};
export declare type ISeedPhraseStoreWithKeys = ISeedPhraseStore & {
    keys: BN[];
};
export declare type MetamaskSeedPhraseStore = ISeedPhraseStore & {
    numberOfWallets: number;
};
export declare type IPrivateKeyStore = TkeyStoreItemType & {
    privateKey: BN;
};
export declare type SECP256k1NStore = IPrivateKeyStore;
export interface ISeedPhraseFormat {
    type: string;
    validateSeedPhrase(seedPhrase: string): boolean;
    deriveKeysFromSeedPhrase(seedPhraseStore: ISeedPhraseStore): BN[];
    createSeedPhraseStore(seedPhrase?: string): Promise<ISeedPhraseStore>;
}
export interface IPrivateKeyFormat {
    privateKey: BN;
    type: string;
    validatePrivateKey(privateKey: BN): boolean;
    createPrivateKeyStore(privateKey: BN): SECP256k1NStore;
}
export interface ITKeyApi {
    storageLayer: IStorageLayer;
    getMetadata(): IMetadata;
    initialize(params: {
        input?: ShareStore;
        importKey?: BN;
        neverInitializeNewKey?: boolean;
    }): Promise<KeyDetails>;
    catchupToLatestShare(shareStore: ShareStore): Promise<CatchupToLatestShareResult>;
    syncShareMetadata(adjustScopedStore?: (ss: unknown) => unknown): Promise<void>;
    inputShareStoreSafe(shareStore: ShareStore): Promise<void>;
    setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void;
    addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
    inputShareStore(shareStore: ShareStore): void;
    deleteShare(shareIndex: BNString): Promise<DeleteShareResult>;
    addRefreshMiddleware(moduleName: string, middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown): void;
    addReconstructKeyMiddleware(moduleName: string, middleware: () => Promise<Array<BN>>): void;
    addShareSerializationMiddleware(serialize: (share: BN, type: string) => Promise<unknown>, deserialize: (serializedShare: unknown, type: string) => Promise<BN>): void;
    generateNewShare(): Promise<GenerateNewShareResult>;
    outputShareStore(shareIndex: BNString): ShareStore;
    inputShare(share: unknown, type: string): Promise<void>;
    outputShare(shareIndex: BNString, type: string): Promise<unknown>;
    encrypt(data: Buffer): Promise<EncryptedMessage>;
    decrypt(encryptedMesage: EncryptedMessage): Promise<Buffer>;
    getTKeyStoreItem(moduleName: string, id: string): Promise<TkeyStoreItemType>;
    getTKeyStore(moduleName: string): Promise<TkeyStoreItemType[]>;
    deleteTKeyStoreItem(moduleName: string, id: string): Promise<void>;
    setTKeyStoreItem(moduleName: string, data: TkeyStoreItemType): Promise<void>;
}
export interface ITKey extends ITKeyApi, ISerializable {
    modules: ModuleMap;
    enableLogging: boolean;
    serviceProvider: IServiceProvider;
    shares: ShareStorePolyIDShareIndexMap;
    privKey: BN;
    refreshMiddleware: RefreshMiddlewareMap;
    reconstructKeyMiddleware: ReconstructKeyMiddlewareMap;
    shareSerializationMiddleware: ShareSerializationMiddleware;
    initialize(params: {
        input?: ShareStore;
        importKey?: BN;
        neverInitializeNewKey?: boolean;
    }): Promise<KeyDetails>;
    reconstructKey(): Promise<ReconstructedKeyResult>;
    reconstructLatestPoly(): Polynomial;
    refreshShares(threshold: number, newShareIndexes: Array<string>, previousPolyID: PolynomialID): Promise<RefreshSharesResult>;
    initializeNewKey(params: {
        userInput?: BN;
        initializeModules?: boolean;
    }): Promise<InitializeNewKeyResult>;
    setKey(privKey: BN): void;
    getKeyDetails(): KeyDetails;
}
