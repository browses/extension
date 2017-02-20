/*
 * getMostViewedData
 *
 * Get most viewed browses.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses/popular
 * @method: GET
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });

/*
 * Merge browses and links.
 */
function merge(links, browses) {
  return links.map((link) => {
    const data = link;
    const browse = browses.filter((b) => b.url === link.url);
    if (data.hasOwnProperty('active')) { delete data.active; }
    if (browse[0].hasOwnProperty('active')) { delete browse[0].active; }
    return Object.assign(data, browse[0]);
  });
}

/*
 * Convert from amazon array data types.
 */
function convert(data, items) {
  const newData = data;
  items.forEach(item => {
    if (data.hasOwnProperty(item)) {
      newData[item] = data[item].values;
    }
  });
  return newData;
}

exports.handle = function handler(event, context) {
  const params = {
    TableName: 'links',
    IndexName: 'viewedIndex',
    KeyConditionExpression: 'active = :ok AND viewed > :vw',
    ExpressionAttributeValues: {
      ':ok': 'true',
      ':vw': 0,
    },
    ScanIndexForward: false,
    Limit: 5,
  };
  /*
   * If a page is specified then add to the limit, to get more
   * results then return the relevent ones.
   */
  const page = event.page ? (parseInt(event.page, 10) - 1) * 5 : 0;
  if (isNaN(page)) {
    context.fail('Bad Request: Failed to convert page to integer.');
    return;
  }
  params.Limit += page;
  /*
   * Scan browses table for most recent 100 browses.
   */
  dynamo.query(params, (err, data) => {
    if (err) {
      context.fail('Internal Error: Failed to query links');
      return;
    }
    if (data.Count > page) {
      const linkData = [];
      const links = data.Items.slice(page);
      links.forEach(link => {
        linkData.push(convert(link, ['browsers', 'interesting', 'useful', 'entertaining']));
      });
      const browses = linkData.map(item => {
        const obj = {
          browser: item.published_first_by,
          published: item.published_first_time,
        };
        return obj;
      });
      if (browses.length > 0) {
        const batchParams = {
          RequestItems: {
            browses: {
              Keys: browses,
            },
          },
        };
        /*
         * Get image/title data from who first published the browses.
         */
        dynamo.batchGet(batchParams, (batchErr, batchData) => {
          if (batchErr) {
            context.fail('Internal Error: Failed to batch get browses.');
            return;
          }
          context.succeed(merge(linkData, batchData.Responses.browses));
        });
      } else {
        context.succeed([]);
      }
    } else {
      context.succeed([]);
    }
  });
};
