import { BufferObj, EncryptedMessage, ShareRequestArgs } from "@tkey/common-types";

class ShareRequest {
  encPubKey: Buffer;

  encShareInTransit: EncryptedMessage;

  availableShareIndexes: Array<string>;

  userAgent: string;

  timestamp: number;

  constructor({ encPubKey, encShareInTransit, availableShareIndexes, userAgent, timestamp }: ShareRequestArgs) {
    const testEncPubKey = encPubKey as BufferObj;
    if (testEncPubKey.type === "Buffer") {
      this.encPubKey = Buffer.from(testEncPubKey.data);
    } else {
      this.encPubKey = (encPubKey as unknown) as Buffer;
    }
    this.availableShareIndexes = availableShareIndexes;
    this.encShareInTransit = encShareInTransit;
    this.userAgent = userAgent;
    this.timestamp = timestamp;
  }
}

export default ShareRequest;
