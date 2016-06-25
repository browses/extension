/*
 * addBrowserUpvote
 *
 * Save browser's interest in a particular URL. The links table
 * contains a list of users who find the browse either useful,
 * interesting or entertaining. This function adds the user to
 * the corresponding list associated with this URL.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /links/upvote
 * @method: POST
 * @params:
 *      - browser: username [string]
 *      - url: browse URL [string]
 *      - upvote: either useful, interesting or entertaining [string]
 * @returns:
 *      - browser [string]
 *      - url [string]
 *      - upvote [string]
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
  if (!event.upvote) {
    context.fail('Bad Request: Missing upvote parameter, either useful interesting, or entertaining');
  }

  const timestamp = (new Date()).getTime();
  const linkParams = {
    TableName: 'links',
    Key: {
      url: event.url,
    },
    UpdateExpression: 'ADD ' + event.upvote + ' :brs, browsers :brs',
    ExpressionAttributeValues: {
      ':brs': dynamo.createSet([event.browser]),
    },
  };

  /*
   * Update links table with browsers interest.
   */
  dynamo.update(linkParams, (err, data) => {
    if (err) {
      context.fail('Internal Error: Failed to update database.');
    }
    context.succeed({
      browser: event.browser,
      url: event.url,
      upvote: event.upvote,
    });
  });
};
