/*
 * deleteBrowseData
 *
 * Delete a browse from DynamoDB and S3.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses
 * @method: DELETE
 * @params:
 *      - published: browse published timestamp [integer]
 *      - shot: shot URL [string]
 *      - token: access token from facebook [string]
 * @returns:
 *      - browser: Facebook ID [string]
 *      - name: Facebook name [string]
 *      - url [string]
 *      - published [integer]
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });
const s3 = new aws.S3();
const request = require('request');


exports.handle = function handler(event, context) {
  if (!event.published) {
    context.fail('Bad Request: Missing published parameter');
    return;
  }
  if (!event.shot) {
    context.fail('Bad Request: Missing shot parameter');
    return;
  }
  if (!event.token) {
    context.fail('Bad Request: Missing token parameter');
    return;
  }
  /*
   * Validate JSON Web Token.
   */
  request({
    url: `https://graph.facebook.com/me?access_token=${event.token}`,
    method: 'GET',
  }, (error, rsp, body) => {
    if (!error && rsp.statusCode === 200) {
      if (!body.hasOwnProperty('error')) {
        // Successfully validated token
        const browser = JSON.parse(body).id;
        const name = JSON.parse(body).name;
        const browseParams = {
          TableName: 'browses',
          Key: {
            browser,
            published: event.published,
          },
        };
        if (event.shot.indexOf('browses/') <= -1) {
          context.fail('Unprocessable Entity: Unrecognised shot url');
          return;
        }
        const s3Params = {
          Bucket: 'browses',
          Key: event.shot.split('browses/')[1],
        };
        /*
         * Delete browse data from browses table.
         */
        dynamo.delete(browseParams, (browseErr) => {
          if (browseErr) {
            context.fail('Internal Error: Failed to delete browse.');
            return;
          }
          s3.deleteObject(s3Params, (s3Err) => {
            if (s3Err) {
              context.fail('Internal Error: Failed to delete screenshot');
              return;
            }
            context.succeed({
              name,
              browser,
              shot: event.shot,
              published: event.published,
            });
          });
        });
      } else {
        const resp = JSON.parse(body);
        context.fail(`Unprocessable Entity: ${resp.error.message}`);
        return;
      }
    } else {
      context.fail('Internal Error: Failed to authorise with Facebook');
      return;
    }
  });
};
