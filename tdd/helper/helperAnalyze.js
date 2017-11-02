'use strict';

const LanguageServiceClient = require('@google-cloud/language')
  .LanguageServiceClient;

require('dotenv').config()

const language = new LanguageServiceClient({
  keyFilename: './google_service_account_key.json'
});
var googleMapsClient = require('@google/maps').createClient({
  key: process.env.GOOGLE_MAPS_KEY
});

function analyze (news, linksite) {
  var promise = new Promise ((resolve, reject) => {
    console.log('---------- proses on helper -----')
    var text = news
    var streetAddress = text.match(/jalan (\w+) (\w+) (\w+)/gi)
    var villageAddress = text.match(/desa\s*(\S+)/gi)
    var districtAddress = text.match(/kecamatan\s*(\S+)/gi)

    var entityFiltered = []
    var addressName = ''
    if (streetAddress !== null) {
      addressName = streetAddress[0]
    } else {
      addressName = streetAddress
    }

    var address = {
      name: addressName,
      village: villageAddress,
      district: districtAddress,
    }
    entityFiltered.push(address)

    // Prepares a document, representing the provided text
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    // Detects entities in the document
    language
      .analyzeEntities({ document: document })
      .then(results => {
        var entities = results[0].entities;

        entities.forEach(entity => {
          if (entity.type === 'LOCATION') {
            entityFiltered.push({
              name: entity.name,
              type: entity.type,
              salience: entity.salience
            })
          }
        })

        entityFiltered = entityFiltered.slice(0,3)
        entityFiltered[0].linksite = linksite

        var addressToAnalyze = ''
        if (entityFiltered[0].name !== null) {
          addressToAnalyze = entityFiltered[0].name
        } else {
          addressToAnalyze = entityFiltered[1].name
        }

        googleMapsClient.geocode({
          address: addressToAnalyze
        }, function (err, response) {
      
          if (response.json.status === 'OK') {
            var resultData = response.json.results
            console.log(resultData[0].geometry.location)
            entityFiltered[0].lat = resultData[0].geometry.location.lat
            entityFiltered[0].lng = resultData[0].geometry.location.lng
          }
          
          resolve(entityFiltered)
          
        })
      })
      .catch(err => {
        console.error('ERROR:', err);
        reject(err)
      })
  })

  return promise
  
}



module.exports = {analyze};

