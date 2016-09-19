"use strict";

const webpush = require('web-push-encryption');
const express = require('express');
const bodyParser = require('body-parser')

const app = express();
const fetch = require('node-fetch');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const Promise = require('promise');
const util = require('./util');
const config = {
  key: 'SET-YOUR-API-KEY',
  db: 'mongodb://YOUR-DB-HOST',
}

app.use(util.overrideContentType());
app.use(bodyParser.json());

app.post('/api/episode', (req, res, next) => {
  res.status(204).end();
  const notification = JSON.parse(req.body.Message);
  if (notification && notification.type === 'available' && notification.rightsGroup === 'web') {
    const payload = normaliseEpisode(notification.episode);
    webpush.setGCMAPIKey(config.key);
    getItem({pids: notification.episode.tleo_id}).then(users => {
      Array.from(users).forEach(user => {
        webpush.sendWebPush(payload, user);
      });
    });
  }
});

app.post('/api/user', (req, res, next) => {
  res.status(204).end();
  const url = config.db;
  MongoClient.connect(url, (err, db) => {
    if (!err) {
      const collection = db.collection('users');
      collection.insert(req.body);
      db.close();
    }
  });
});

app.post('/api/tidy', (req, res, next) => {
  res.status(204).end();
  const url = config.db;
  MongoClient.connect(url, (err, db) => {
    if (!err) {
      const collection = db.collection('users');
      if (req.body.endpoint) {
        collection.remove({endpoint: req.body.endpoint});
      } else {
        collection.remove();
      }
      db.close();
    }
  });
});

app.post('/api/removepid', (req, res, next) => {
  updateItem('$pull', req.body.endpoint, req.body.pid).then(() => {
    res.status(204).end();
  }).catch(error => {
    res.json(error).end();
  });
});

app.post('/api/newpid', (req, res, next) => {
  updateItem('$addToSet', req.body.endpoint, req.body.pid).then(() => {
    res.status(204).end();
  }).catch(error => {
    res.json(error).end();
  });
});

app.post('/api/pid', (req, res, next) => {
  getItem({endpoint: req.body.endpoint}).then(user => {
    getEpisodeData('programmes', user[0].pids.join()).then(pids => {
      res.json(pids).end();
    })
  }).catch(error => {
    res.json(error).end();
  });
});

app.listen(3030);

function getItem(item) {
  return new Promise((resolve, reject) => {
    const url = config.db;
    MongoClient.connect(url, (err, db) => {
      if (err) {
        reject(err);
      } else {
        const collection = db.collection('users');
        collection.find(item).toArray((err, result) => {
          if (err) {
            reject(err);
          } else if (result.length) {
            resolve(result);
          } else {
            reject('noting saved');
          }
        });
        db.close();
      }
    });
  });
}

function updateItem(direction, endpoint, pid) {
  return new Promise((resolve, reject) => {
    const url = config.db;
    MongoClient.connect(url, (err, db) => {
      if (!err) {
        const collection = db.collection('users');
        collection.update(
          { 'endpoint': endpoint },
          { [direction]: { 'pids': pid }}
        );
        resolve();
        db.close();
      } else { reject(err); }
    });
  });
}

function getEpisodeData(type, pid) {
  return new Promise((resolve, reject) => {
    fetch(`https://ibl.api.bbci.co.uk/v1/${type}/${pid}`)
    .then(response => response.json())
    .then(json => {
      resolve(json);
    });
  });
}

function normaliseEpisode(episode) {
  const title = episode.subtitle ? `${episode.title} - ${episode.subtitle}` : episode.title,
  icon = episode.images.standard.replace('{recipe}', '192x192').replace('http://', 'https://'),
  body = episode.synopses.small ? episode.synopses.small : episode.synopses.medium,
  url = `http://www.bbc.co.uk/iplayer/episode/${episode.id}/${title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-')}`;
  return JSON.stringify({
    title,
    icon,
    body,
    data: {
      url
    }
  });
}
