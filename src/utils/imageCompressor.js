/**
 * Utility functions for client-side image compression and processing.
 */

/**
 * Compresses an image File using HTML5 Canvas.
 * @param {File} file - The image file to compress.
 * @param {Object} options - Compression options.
 * @param {number} [options.maxWidth=1024] - Maximum width of output image.
 * @param {number} [options.maxHeight=1024] - Maximum height of output image.
 * @param {number} [options.quality=0.8] - Quality from 0.0 to 1.0.
 * @param {string} [options.outputType='image/jpeg'] - Output MIME type.
 * @returns {Promise<File>} Compressed File object.
 */
export const compressImageFile = (file, options = {}) => {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    outputType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name, {
              type: outputType,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          outputType,
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Converts a File or Blob to a Base64 data URL string.
 * @param {File|Blob} file 
 * @returns {Promise<string>}
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

const imageCompressor = {
  compressImageFile,
  fileToBase64,
};

export default imageCompressor;
