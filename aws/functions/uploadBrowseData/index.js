/*
 * uploadBrowseData
 *
 * Upload a browse. Browser must be authenticated and send a valid
 * jwt token from cognito.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses
 * @method: POST
 * @params:
 *      - browser: username [string]
 *      - url: browse URL [string]
 *      - title: browse title [string]
 *      - shot: browse screenshot [image/jpeg]
 *      - token: jwt token from cognito [string]
 * @returns:
 *      - published: timestamp browse was published in ms [integer]
 *      - browser: username [string]
 *      - url: browse URL [string]
 *      - title: browse title [string]
 *      - shot: link to S3 store of image [string]
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });
const cognito = new aws.CognitoIdentity();
const settings = require('./settings.json');
const jwt = require('jsonwebtoken');
const s3 = new aws.S3();

var getGUID = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};


exports.handle = function handler(event, context) {
  if (!event.browser) {
    context.fail('Bad Request: Missing browser');
    return;
  }
  if (!event.url) {
    context.fail('Bad Request: Missing url parameter.');
    return;
  }
  if (!event.title) {
    context.fail('Bad Request: Missing title parameter.');
    return;
  }
  if (!event.shot) {
    context.fail('Bad Request: Missing shot parameter.');
    return;
  }
  if (!event.token) {
    context.fail('Bad Request: Missing token parameter.');
    return;
  }
  /*
   * Check JWT for authentication.
   */
  const timestamp = (new Date()).getTime();
  const decoded = jwt.decode(event.token);
  if (decoded && decoded.hasOwnProperty('exp') &&
      decoded.hasOwnProperty('sub')) {
    const idParams = {
      IdentityPoolId: settings.identityPoolId,
      DeveloperUserIdentifier: event.browser,
      MaxResults: 1,
    };
    /*
     * Check developer authenticated user (browser) exists
     * in the identity pool. If so, check the identity id
     * matches that in the token.
     */
    cognito.lookupDeveloperIdentity(idParams, (idError, idData) => {
      if (idError) {
        context.fail('Unprocessable Entity: Browser not registered.');
        return;
      }
      if (!idData.IdentityId) {
        context.fail('Internal Error: Failed to get identity id');
        return;
      }
      if (idData.IdentityId !== decoded.sub) {
        context.fail('Unauthorized: Browser and token ID didnt match.');
        return;
      }
      if (decoded.exp <= timestamp / 1000.0) {
        context.fail('Unauthorized: Token has expired.');
        return;
      }
      /*
       * Browser validated!
       */
      const guid = getGUID();
      const buf = new Buffer(event.shot.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const params = {
        Bucket: 'browses',
        Key: `${event.browser}/${guid}`,
        Body: buf,
        ContentEncoding: 'base64',
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      };
      /*
       * Save screenshot image to S3.
       */
      s3.putObject(params, (s3Err) => {
        if (s3Err) {
          context.fail('Internal Error: Failed to save screenshot to S3.');
          return;
        }
        const browseParams = {
          TableName: 'browses',
          Item: {
            browser: event.browser,
            published: timestamp,
            url: event.url,
            shot: `https://s3-eu-west-1.amazonaws.com/browses/${event.browser}/${guid}`,
          },
        };
        /*
         * Store browse data in browses table in DynamoDB.
         */
        dynamo.put(browseParams, (browseErr) => {
          if (browseErr) {
            context.fail('Internal Error: Failed to store browse in database.');
            return;
          }
          const linkParams = {
            TableName: 'links',
            Key: {
              url: event.url,
            },
            UpdateExpression: 'ADD browsers :brs SET title = :tle, published_last_by = :brw, published_last_time = :ts, published_first_by = if_not_exists(published_first_by, :brw), published_first_time = if_not_exists(published_first_time, :ts)',
            ExpressionAttributeValues: {
              ':tle': event.title.toString(),
              ':brs': dynamo.createSet([event.browser]),
              ':brw': event.browser,
              ':ts': timestamp,
            },
          };
          /*
           * Update browse data in links table in DynamoDB.
           */
          dynamo.update(linkParams, (linkErr) => {
            if (linkErr) {
              context.fail('Internal Error: Failed to update browse link.');
              return;
            }
            context.succeed({
              published: timestamp.toString(),
              browser: event.browser,
              url: event.url,
              title: event.title,
              shot: `https://s3-eu-west-1.amazonaws.com/browses/${event.browser}/${guid}`,
            });
          });
        });
      });
    });
  } else {
    context.fail('Unprocessable Entity: Failed to parse token.');
    return;
  }
};
