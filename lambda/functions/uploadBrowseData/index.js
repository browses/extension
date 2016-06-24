/*
 * uploadBrowseData
 *
 * Upload a browse.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses
 * @method: POST
 * @params:
 *      - browser: username [string]
 *      - url: browse URL [string]
 *      - title: browse title [string]
 *      - shot: browse screenshot [image/jpeg]
 * @returns:
 *      - published: timestamp browse was published [integer]
 *      - browse: username [string]
 *      - url: browse URL [string]
 *      - title: browse title [string]
 *      - shot: link to S3 store of image [string]
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });
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
    context.fail('Bad Request: Missing url');
    return;
  }
  if (!event.title) {
    context.fail('Bad Request: Missing title');
    return;
  }
  if (!event.shot) {
    context.fail('Bad Request: Missing shot');
    return;
  }

  const guid = getGUID();
  const timestamp = (new Date()).getTime();
  let buf = new Buffer(event.shot.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const params = {
    Bucket: 'browses',
    Key: event.browser + '/' + guid,
    Body: buf,
    ContentEncoding: 'base64',
    ContentType: 'image/jpeg',
    ACL: 'public-read',
  };

  /*
   * Save screenshot image to S3.
   */
  s3.putObject(params, (err, data) => {
    if (err) {
      context.fail('Internal Error: Failed to save screenshot to S3.');
    }
    const browseParams = {
      TableName: 'browses',
      Item: {
        browser: event.browser,
        published: timestamp,
        url: event.url,
        shot: 'https://s3-eu-west-1.amazonaws.com/browses/' + event.browser + '/' + guid,
      },
    };
    /*
     * Store browse data in browses table in DynamoDB.
     */
    dynamo.put(browseParams, (err, data) => {
      if (err) {
        context.fail('Internal Error: Failed to store browse in database.');
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
      dynamo.update(linkParams, (err, data) => {
        if (err) {
          context.fail('Internal Error: Failed to update browse link.');
        }
        context.succeed({
          published: timestamp.toString(),
          browser: event.browser,
          url: event.url,
          title: event.title,
          shot: 'https://s3-eu-west-1.amazonaws.com/browses/' + event.browser + '/' + guid,
        });
      });
    });
  });
};
