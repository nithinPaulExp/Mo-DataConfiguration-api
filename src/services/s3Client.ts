import {S3Client,PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
export default class S3Helper {
    static async uploadFile(content, fileName) {
        const s3Client = new S3Client({ region: process.env.AWS_REGION });
        var params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName,
            Body: content,
            ContentType: 'application/json',
            CacheControl: 'public, max-age=86400'
        }
        await s3Client.send(new PutObjectCommand(params));
    }
    
   static async readS3JSONData(fileName):Promise<any>{
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName
          };

          const s3Client = new S3Client({ region: process.env.AWS_REGION });
          try {
            // Create a helper function to convert a ReadableStream to a string.
            const streamToString = (stream) =>
              new Promise((resolve, reject) => {
                const chunks = [];
                stream.on("data", (chunk) => chunks.push(chunk));
                stream.on("error", reject);
                stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
              });
        
            // Get the object} from the Amazon S3 bucket. It is returned as a ReadableStream.
            const data = await s3Client.send(new GetObjectCommand(params));
            // Convert the ReadableStream to a string.
            const json = await streamToString(data.Body);
            return json;
          } catch (err) {
            console.log("Error", err);
            return null;
          }
    }
}

