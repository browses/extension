/*
 * deleteBrowseData
 *
 * Delete a browse from DynamoDB and S3.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses
 * @method: DELETE
 * @params:
 *      - browser: username [string]
 *      - published: browse published timestamp [integer]
 *      - shot: shot URL [string]
 *      - token: jwt token from cognito [string]
 * @returns:
 *      - browser [string]
 *      - url [string]
 *      - published [integer]
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
    url: 'https://7ibd5w7y69.execute-api.eu-west-1.amazonaws.com/beta/validate',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    json: { username: event.browser, token: event.token, service: 'browses' },
  }, (error, rsp, body) => {
    if (!error && rsp.statusCode === 200) {
      // Successfully validated token
      const browseParams = {
        TableName: 'browses',
        Key: {
          browser: event.browser,
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
            browser: event.browser,
            shot: event.shot,
            published: event.published,
          });
        });
      });
    } else {
      context.fail(body.errorMessage);
      return;
    }
  });
};
