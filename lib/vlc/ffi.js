'use strict';

const O = require('ose')(module);

var Child = require('child_process');
var Path = require('path');

// Public {{{1
exports.init = function() {  // {{{2
  this.on({
    playUri: playUri,
    /*
    play: play,
    pause: pause,
    stop: stop,
    turnOff: turnOff,
    fullscreen: fullscreen,
    raise: raise,
    shuffle: shuffle,
    seek: seek,
    next: next,
    previous: previous,
    */
  });
};

exports.homeInit = function(entry) {  // {{{2
  entry.queueStateTimeout = 0;

//  entry.on('remove', onRemove.bind(entry));
};

// }}}1
// Command handlers {{{1
function playUri(req, socket) {  // {{{2
/**
 * Play media from URI.
 *
 * @param req {String} Media URI
 *
 * @method playUri
 * @handler
 */

//  console.log('VLC PLAY URI');

  getVlc(this.entry, socket, function(entry, vlc) {
    vlc.send({
      type: 'playUrl',
      url: req,
    });

    O.link.close(socket);
    return;
  });

  /*
  var media = vlc.mediaFromUrl(req);
  //media.parseSync();

  var player = vlc.mediaplayer;
  player.media = media;
  player.play();

  media.on('MetaChanged',function(){
    console.log('META CHANGED', arguments);
  });

  player.on('Paused',function(){
    console.log("paused");
  });
  */
};

// }}}1
// Event handlers {{{1
// `this` is bound to entry
function onMessage(child, msg) {
  if (child !== this.child) {
    return;
  }

  switch (msg.type) {
  case 'meta':
    var s = {};
    s[msg.name] = msg.value;
    this.setState({info: s});
    return;
  case 'can':
    var s = {};
    s[msg.name] = Boolean(msg.value);
    this.setState({can: s});
    return;
  case 'status':
    this.setState({status: msg.value});
    return;
  case 'pos':
    if (msg.value) {
      this.setState({pos: {
        length: msg.length,
        pos: msg.pos,
      }});
    } else {
      this.setState({pos: null});
    }
    return;
  }
  
  console.log('VLC CHILD MESSAGE', msg);
  return;
};

function onError(child, err) {  // {{{2
  console.log('VLC CHILD ERROR');
  O.log.error(err);
};

function onExit(child, code, signal) {  // {{{2
  console.log('VLC CHILD EXIT', code, signal);
};

function onDisconnect(child) {  // {{{2
  console.log('VLC CHILD DISCONNECT');
};

function onClose(child, code, signal) {  // {{{2
  console.log('VLC CHILD CLOSE', code, signal);
};

// }}}1
// Private {{{1
function getVlc(entry, socket, cb) {  // {{{2
  if (entry.child) {
    cb(entry, entry.child);
    return;
  }

  var child = Child.fork(Path.dirname(module.filename) + '/child.js');

  child.on('error', onError.bind(entry, child));
  child.on('exit', onExit.bind(entry, child));
  child.on('disconnect', onDisconnect.bind(entry, child));
  child.on('close', onClose.bind(entry, child));

  child.once('message', done);
  
  function done(msg) {
    if (msg === 'started') {
      entry.child = child;
      child.on('message', onMessage.bind(entry, child));
      cb(entry, child);
    } else {
      O.link.error(socket, O.error(entry, 'VLC_NOT_STARTED', msg));
    }
  };
};

// }}}1
