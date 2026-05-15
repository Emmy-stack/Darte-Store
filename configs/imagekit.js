import ImageKit, { toFile } from "@imagekit/nodejs";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

export async function uploadToImageKit({ file, fileName, folder }) {
  const uploadFile = await toFile(file, fileName);
  return imagekit.files.upload({
    file: uploadFile,
    fileName,
    folder,
  });
}

export function buildImageUrl({ src, transformation }) {
  return imagekit.helper.buildSrc({
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    src,
    transformation,
  });
}

export default imagekit;