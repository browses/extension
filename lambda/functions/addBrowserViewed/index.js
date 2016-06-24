/*
 * addBrowserViewed
 *
 * Add browser to the list of viewers of a particular URL.
 * The links table contains a list of browsers who have clicked
 * into this particular browse.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses/{browse_id}
 * @method: POST
 * @params:
 *      - browser: username [string]
 *      - url: browse URL [string]
 * @returns:
 *      - browser [string]
 *      - url [string]
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });


exports.handle = function handler(event, context) {

  if (!event.browser) {
    context.fail('Bad Request: Missing browser parameter');
    return;
  }
  if (!event.url) {
    context.fail('Bad Request: Missing url parameter');
    return;
  }

  const timestamp = (new Date()).getTime();
  const linkParams = {
    TableName: 'links',
    Key: {
        url: event.url,
    },
    UpdateExpression: 'ADD browsers :brs',
    ExpressionAttributeValues: {
      ':brs': dynamo.createSet([event.browser]),
    },
  };

  /*
   * Update links table with browsers view.
   */
  dynamo.update(linkParams, (err, data) => {
    if (err) {
      context.fail('Internal Error: Failed to update database.');
    }
    context.succeed({
      browser: event.browser,
      url: event.url,
    });
  });
};
