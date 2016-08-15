/*
 * deleteBrowseData
 *
 * Delete a browse from DynamoDB and S3.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses
 * @method: DELETE
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });
const s3 = new aws.S3();
const request = require('request');


exports.handle = function handler(event, context) {
  if (!event.browser) {
    context.fail('Bad Request: Missing browser parameter');
    return;
  }
  if (!event.published) {
    context.fail('Bad Request: Missing published parameter');
    return;
  }
  if (!event.image) {
    context.fail('Bad Request: Missing image parameter');
    return;
  }
  if (!event.token) {
    context.fail('Bad Request: Missing token parameter');
    return;
  }
  /*
   * Validate access token and get Facebook ID and name.
   */
  request({
    url: `https://graph.facebook.com/me?access_token=${event.token}`,
    method: 'GET',
  }, (error, rsp, body) => {
    if (!error && rsp.statusCode === 200) {
      if (!body.hasOwnProperty('error')) {
        /*
         * Successfully validated token
         */
        const response = JSON.parse(body);
        if (response.id !== event.browser) {
          context.fail('Unprocessable Entity: Browser didnt match the token');
          return;
        }
        const name = response.name;
        const browseParams = {
          TableName: 'browses',
          Key: {
            browser: event.browser,
            published: event.published,
          },
        };
        const s3Params = {
          Bucket: 'browses',
          Key: event.image.split('browses/')[1],
        };
        /*
         * Delete browse data from browses table.
         */
        dynamo.delete(browseParams, (browseErr) => {
          if (browseErr) {
            context.fail(browseErr);
            return;
            context.fail('Internal Error: Failed to delete browse.');
            return;
          }
          s3.deleteObject(s3Params, (s3Err) => {
            if (s3Err) {
              context.fail('Internal Error: Failed to delete screenshot');
              return;
            }
            context.succeed({
              browser: event.browser,
              published: event.published,
              image: event.image,
              name,
            });
          });
        });
      } else {
        const resp = JSON.parse(body);
        context.fail(`Unprocessable Entity: ${resp.error.message}`);
        return;
      }
    } else {
      context.fail('Unauthorized: Failed to validate access token');
      return;
    }
  });
};
