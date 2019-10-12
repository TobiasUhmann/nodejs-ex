//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');

const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const cors = require('cors')

var ObjectID = require('mongodb').ObjectID; 

const Track = require('./models/track.js')
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null) {
  var mongoHost, mongoPort, mongoDatabase, mongoPassword, mongoUser;
  // If using plane old env vars via service discovery
  if (process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'];
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'];
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'];
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'];
    mongoUser = process.env[mongoServiceName + '_USER'];

  // If using env vars from secret from service binding  
  } else if (process.env.database_name) {
    mongoDatabase = process.env.database_name;
    mongoPassword = process.env.password;
    mongoUser = process.env.username;
    var mongoUriParts = process.env.uri && process.env.uri.split("//");
    if (mongoUriParts.length == 2) {
      mongoUriParts = mongoUriParts[1].split(":");
      if (mongoUriParts && mongoUriParts.length == 2) {
        mongoHost = mongoUriParts[0];
        mongoPort = mongoUriParts[1];
      }
    }
  }

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/counts', function (req, res) {
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').find({}).toArray(function(err, result){
      res.send(result);
    });
  } else {
    res.send('error');
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

//
// Define routes
//

app.get('/tracks', function (req, res) {
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('tracks').find({}).toArray(function(err, result){
      res.send(result);
    });
  } else {
    res.send('error');
  }
});

app.post('/track', (request, response) => {
  const newTrack = request.body

  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection("tracks").insertOne(newTrack, function(err, createdTrack) {
      response.status(201).json(newTrack)
    });
  } else {
    res.send('error');
  }
})

// app.get('/track/:trackId', (request, response) => {
//   const trackId = request.params.trackId

//   Track.findById(trackId, (error, foundTrack) => {
//     if (error) {
//       console.error(error)
//       response.status(500).send(error)
//     }

//     response.status(200).json(foundTrack)
//   })
// })

// app.put('/track/:trackId', (request, response) => {
//   const trackId = request.params.trackId
//   const update = request.body

//   Track.findByIdAndUpdate(trackId, update, (error, updatedTrack) => {
//     if (error) {
//       console.error(error)
//       response.status(500).send(error)
//     }

//     response.status(200).json(updatedTrack)
//   })
// })

app.put('/track/:trackId', (request, response) => {
  const trackId = request.params.trackId
  const update = request.body

  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    console.log('update')
    delete update._id;
    console.log(update)
    console.log(trackId)
    db.collection("tracks").update(
      { _id: ObjectID(trackId) },
      {
        $set: update
      },
      function(err, updatedTrack) {
        if (err) {
          response.status(500).json(err)
        } else {
          response.status(200).json(updatedTrack)
        }
      }
   )
  } else {
    res.send('error');
  }
})

// app.delete('/track/:trackId', (request, response) => {
//   const trackId = request.params.trackId

//   track.findByIdAndRemove(trackId, (error, removedTrack) => {
//     if (error) {
//       console.error(error)
//       response.status(500).send(error)
//     }

//     response.status(200).json(removedTrack)
//   })
// })

//
//
//

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
