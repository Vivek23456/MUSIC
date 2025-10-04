import { NFTStorage, File as NFTFile } from "nft.storage";

function makeClient() {
  return new NFTStorage({ token: import.meta.env.VITE_NFT_STORAGE_KEY || "" });
}

export async function uploadToNFTStorage(file: File) {
  const client = makeClient();

  try {
    // For audio, just use `image` property
    const metadata = await client.store({
      name: file.name,
      description: "Music track upload",
      image: new NFTFile([file], file.name, { type: file.type }),
    });

    const cid = metadata.url.replace("ipfs://", "");
    const url = `https://${cid}.ipfs.nftstorage.link/${file.name}`;

    return { cid, url };
  } catch (err) {
    console.error("NFT.Storage upload failed:", err);
    throw new Error("Failed to upload to NFT.Storage");
  }
}
