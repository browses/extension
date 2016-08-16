/*
 * uploadBrowseData
 *
 * Upload a browse. Browser must send a valid access token from Facebook.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses
 * @method: POST
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });
const s3 = new aws.S3();
const request = require('request');

const getGUID = function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};


exports.handle = function handler(event, context) {
  if (!event.url) {
    context.fail('Bad Request: Missing url parameter.');
    return;
  }
  if (!event.title) {
    context.fail('Bad Request: Missing title parameter.');
    return;
  }
  if (!event.image) {
    context.fail('Bad Request: Missing image parameter.');
    return;
  }
  if (!event.token) {
    context.fail('Bad Request: Missing token parameter.');
    return;
  }
  /*
   * Validate access token, and get Facebook ID and name.
   */
  const timestamp = (new Date()).getTime();
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
        const browser = response.id;
        const name = response.name;
        const guid = getGUID();
        const buf = new Buffer(event.image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const params = {
          Bucket: 'browses',
          Key: `${browser}/${guid}`,
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
              browser,
              published: timestamp,
              name,
              url: event.url,
              image: `https://s3-eu-west-1.amazonaws.com/browses/${browser}/${guid}`,
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
            const expr = 'ADD browsers :brs SET title = :tle, published_last_by = :brw, ' +
                         'published_last_time = :ts, published_first_by = ' +
                         'if_not_exists(published_first_by, :brw), ' +
                         'published_first_time = if_not_exists(published_first_time, :ts)';
            const linkParams = {
              TableName: 'links',
              Key: {
                url: event.url,
              },
              UpdateExpression: expr,
              ExpressionAttributeValues: {
                ':tle': event.title.toString(),
                ':brs': dynamo.createSet([browser]),
                ':brw': browser,
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
                browser,
                name,
                published: timestamp.toString(),
                url: event.url,
                title: event.title,
                image: `https://s3-eu-west-1.amazonaws.com/browses/${browser}/${guid}`,
              });
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
