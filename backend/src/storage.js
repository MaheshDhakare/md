const AWS = require('aws-sdk');
const s3Endpoint = process.env.S3_ENDPOINT;
const bucket = process.env.S3_BUCKET || 'property-files';
const accessKey = process.env.S3_ACCESS_KEY;
const secretKey = process.env.S3_SECRET_KEY;

const s3 = new AWS.S3({
  endpoint: s3Endpoint,
  accessKeyId: accessKey,
  secretAccessKey: secretKey,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

async function uploadToS3(key, buffer, contentType){
  await s3.putObject({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }).promise();
  const url = (s3Endpoint || '').replace(/\/$/, '') + '/' + bucket + '/' + key;
  return { key, url };
}

module.exports = { uploadToS3 };
