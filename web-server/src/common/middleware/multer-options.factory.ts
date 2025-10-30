import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

import * as multerS3 from 'multer-s3';
import { extname } from 'path';
import * as moment from 'moment-timezone';

let uploadCounter = 0; // 파일 업로드 카운터
export const multerOptionsFactory = (foldername: string): MulterOptions => {
  return {
    storage: multerS3({
      s3: new S3Client({
        region: process.env.AWS_S3_REGION,
        credentials: {
          accessKeyId: process.env.AWS_S3_ACCESS_KEY,
          secretAccessKey: process.env.AWS_S3_SECRET_KEY,
        },
      }),
      bucket: process.env.AWS_S3_BUCKET,
      //acl: 'public-read',
      contentType: (req, file, cb) => {
        cb(null, file.mimetype);
      },
      key(req: any, file, callback) {
        const mimeTypeMap = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'audio/mpeg': '.mp3',
          'audio/wav': '.wav',
        };

        const ext = mimeTypeMap[file.mimetype] || '.png';
        const yymmdd = moment().format('YYMMDD-HHmmss');
        uploadCounter += 1;

        const fileName = `${foldername}/${yymmdd}-${uploadCounter}${ext}`;
        callback(null, fileName);
      },
    }),
  };
};

export async function deleteFileFromS3(url: string): Promise<void> {
  const s3 = new S3Client({
    region: process.env.AWS_S3_REGION,
    credentials: {
      accessKeyId: process.env.AWS_S3_ACCESS_KEY,
      secretAccessKey: process.env.AWS_S3_SECRET_KEY,
    },
  });

  const newUrl = new URL(url);
  const key = newUrl.pathname.substring(1);

  const deleteParams = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  };

  await s3.send(new DeleteObjectCommand(deleteParams));
}
