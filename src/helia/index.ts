import { createHeliaHTTP } from '@helia/http';
import { unixfs, UnixFS } from '@helia/unixfs';
import { CID } from 'multiformats/cid';
import { delegatedHTTPRouting } from '@helia/routers';

type HeliaHTTP = Awaited<ReturnType<typeof createHeliaHTTP>>

export class HeliaService {
  private readonly helia: HeliaHTTP;
  private readonly fs: UnixFS;

  private constructor(helia: HeliaHTTP) {
    this.helia = helia;
    this.fs = unixfs(this.helia);
  }

  public static async create(gatewayUrl = 'https://delegated-ipfs.dev'): Promise<HeliaService> {
    const helia = await createHeliaHTTP({
        routers: [delegatedHTTPRouting(gatewayUrl)]
    });
    return new HeliaService(helia);
  }

  public async stop(): Promise<void> {
    await this.helia.stop();
  }

  async fetchCid(cid: string): Promise<Uint8Array> {
    const cidFromString = CID.parse(cid);
    const chunks = [];
    let totalLength = 0;
    for await (const chunk of this.fs.cat(cidFromString)) {
      chunks.push(chunk);
      totalLength += chunk.length;
    }
    const content = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      content.set(chunk, offset);
      offset += chunk.length;
    }
    return content;
  }
}
