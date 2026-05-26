const { buildImageUrl } = require('./configs/imagekit.js');
console.log("URL:", buildImageUrl({src: 'test', transformation: []}));
