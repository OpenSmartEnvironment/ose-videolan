'use strict';

var O = require('ose').module(module);

var Process = require('child_process');
var Dbus = require('dbus-native');

/** Docs {{{1
 * @module videolan
 */

/**
 * Implementation of media player playback using VLC over D-Bus
 *
 * @class videolan.lib.vlc
 */

// Public {{{1
exports.init = function() {  // {{{2
  this.on({
    stop: stop,
    pause: pause,
    play: play,
    playUri: playUri,
    turnOff: turnOff,
    fullscreen: fullscreen,
    raise: raise,
    shuffle: shuffle,
    seek: seek,
    next: next,
    previous: previous,
  });
};

exports.homeInit = function(entry) {  // {{{2
  entry.queueStateTimeout = 0;
  entry.state = {};

  entry.on('remove', onRemove.bind(entry));

  /*

  if (VlcVersion) {
    doIt();
  } else {
    getVersion(doIt);
  }

  function doIt(err, version) {
    if (err) {
      O.log.error(entry, err);
      return;
    }

    if (version) {
      VlcVersion = version;
    }

  */

  getObject(entry, function(err) {
    if (err) {
      O.log.error(err);
      return;
    }

    getStatus(entry);
    getShuffle(entry);
    getMetadata(entry);
    getFullscreen(entry);
    return;
  });

    /*
    return;
  }
  */
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

  var e = this.entry;

  e.clearInfo = true;
  getObject(e, function(err) {
    if (err) {
      O.link.error(socket, err);
      return;
    }

    e.bus.invoke({
      destination: e.serviceName,
      path: '/org/mpris/MediaPlayer2',
      interface: 'org.freedesktop.DBus.Properties',
      member: 'Get',
      signature: 'ss',
      body: [ 'org.mpris.MediaPlayer2.TrackList', 'Tracks'],
    }, onTracks);
    return;
  });

  function onTracks(err, tracks) {
    if (tracks) {
      tracks = tracks[1][0];
      for (var i = 0; i < tracks.length; i++) {
        e.bus.invoke({
          destination: e.serviceName,
          path: '/org/mpris/MediaPlayer2',
          interface: 'org.mpris.MediaPlayer2.TrackList',
          member: 'RemoveTrack',
          signature: 'o',
          body: [tracks[i]],
        });
      }
    }

    openUri(e, req);
    O.link.close(socket);
  }
};

function play(req) {  // {{{2
/**
 * Play
 *
 * @method play
 * @handler
 */

//  console.log('VLC PLAY', req, typeof this.entry.object.Play);

  this.entry.clearInfo = true;
  this.entry.object && this.entry.object.Play();
};

function pause(req) {  // {{{2
/**
 * Pause playback
 *
 * @method pause
 * @handler
 */

  this.entry.object && this.entry.object.Pause();
};

function stop(req, socket) {  // {{{2
/**
 * Stop playback
 *
 * @method stop
 * @handler
 */

//  console.log('VLC STOP', req);

  if (! this.entry.object) {
    O.link.error(socket, O.error(this.entry, 'Can\'t stop, playback is not connected', req));
    return;
  }

  this.entry.object.Stop(function(err) {
    if (err) {
      O.link.error(socket, err);
    } else {
      O.link.close(socket);
    }
  });
  return;
};

function turnOff(req) {  // {{{2
/**
 * Turns the player off.
 *
 * @param req None
 *
 * @method turnOff
 * @handler
 */

  quit(this.entry);
};

function fullscreen(req, socket) {  // {{{2
/**
 * Toggles fullscreen
 *
 * @param req {Object} Fullscreen?
 *
 * @method fullscreen
 * @handler
 */

  if (req === 'toggle') {
    req = ! this.entry.state.fullscreen;
  } else {
    req = Boolean(req);
  }

  if (! this.entry.object) {
    O.link.close(socket);
    return;
  }

  this.entry.bus.invoke({
    destination: this.entry.serviceName,
    path: '/org/mpris/MediaPlayer2',
    interface: 'org.freedesktop.DBus.Properties',
    member: 'Set',
    signature: 'ssv',
    body: [ 'org.mpris.MediaPlayer2', 'Fullscreen', [ 'b', req ] ],
  }, O.link.bind(socket));
  return;
};

function raise(req) {   // {{{2
/**
 * Raises window
 *
 * @method raise
 * @handler
 */

  this.entry.core.Raise();
};

function shuffle(req, socket) {  // {{{2
/**
 * Toggles shuffle mode
 *
 * @param req {Boolean} Shuffle?
 *
 * @method shuffle
 * @handler
 */

  if (req === 'toggle') {
    req = ! this.entry.state.shuffle;
  } else {
    req = Boolean(req);
  }

  if (! this.entry.object) {
    O.link.close(socket);
    return;
  }

  this.entry.bus.invoke({
    destination: this.entry.serviceName,
    path: '/org/mpris/MediaPlayer2',
    interface: 'org.freedesktop.DBus.Properties',
    member: 'Set',
    signature: 'ssv',
    body: [ 'org.mpris.MediaPlayer2.Player', 'Shuffle', [ 'b', req ] ],
  }, O.link.bind(socket));
  return;
};

function seek(req) {  // {{{2
/**
 * Seek media
 *
 * @param req {Number} Position in microseconds
 *
 * @method seek
 * @handler
 */

  if (this.entry.object) {
    this.entry.object.Seek(req);
    getPos(this.entry);
  }
};

function next(req) {  // {{{2
/**
 * Skip to next media
 *
 * @param req {Object} Request object TODO
 *
 * @method next
 * @handler
 */

  if (this.entry.object) {
    this.entry.clearInfo = true;
    this.entry.object.Next();
  }
};

function previous(req) {  // {{{2
/**
 * Skip to previous media
 *
 * @param req {Object} Request object TODO
 *
 * @method previous
 * @handler
 */

  if (this.entry.object) {
    this.entry.clearInfo = true;
    this.entry.object.Previous();
  }
};

// }}}1
// Event Handlers {{{1
function onRemove() {  // {{{2
  quit(this);
}

function onCanPause(err, result) {  // {{{2
  this.setState({can: {pause: result === 1}});
}

function onCanSeek(err, result) {  // {{{2
  this.setState({can: {seek: result === 1}});
}

function onCanGoPrevious(err, result) {  // {{{2
  this.setState({can: {goPrevious: result === 1}});
}

function onCanGoNext(err, result) {  // {{{2
  this.setState({can: {goNext: result === 1}});
}

function onCanSetFullscreen(err, result) {  // {{{2
  this.setState({can: {setFullscreen: result === 1}});
}

function onSeeked(val) {  // {{{2
  if (! (val && this.state.pos && this.state.pos.length)) return;

  val = val / 1000000;
  var at = new Date().getTime();

  if (! (
    typeof this.state.pos.at === 'number' &&
    typeof this.state.pos.value === 'number' &&
    (
      Math.abs(val - this.state.pos.value) < 1 ||
      Math.abs((at - this.state.pos.at) / 1000 - (val - this.state.pos.value)) < 1
    )
  )) {
    this.setState({pos: {
      value: val,
      at: at,
    }});
  }
};

function propertyChanged(iface, props) {  // {{{2
  for (var key in props) {
    var value = props[key];
    key = value[0];
    value = value[1];
    if (value) {
      value = value[1][0];
    }

    switch (key) {
    case 'CanPause':
      this.setState({can: {pause: Boolean(value)}});
      break;
    case 'CanGoPrevious':
      this.setState({can: {prev: Boolean(value)}});
      break;
    case 'CanGoNext':
      this.setState({can: {next: Boolean(value)}});
      break;
    case 'CanSeek':
      this.setState({can: {seek: Boolean(value)}});
      break;
    case 'CanPlay':
      this.setState({can: {play: Boolean(value)}});
      break;
    case 'Shuffle':
      this.setState({shuffle: Boolean(value)});
      break;
    case 'PlaybackStatus':
      readStatus(this, value);
      break;
    case 'Metadata':
      readMetadata(this, value);
      break;
    case 'Fullscreen':
      this.setState({fullscreen: Boolean(value)});
      break;
    case 'Rate':
    case 'Volume':
      break; // TODO
    default:
      O.log.unhandled('Unexpected property change.', {key: key, value: value});
    }
  }
}

// }}}1
// Private {{{
//var VlcVersion = '';
var MatchVlc = /^\s*(\d+)\s.+\s.+\s.+\s+vlc.*--control.*dbus/;

function readMetadata(that, val) {  // {{{2
  if (that.clearInfo) {
    delete that.clearInfo;
    that.setState({info: null});
  }

  for (var i = 0; i < val.length; i++) {
    var v = val[i];
    var key = v[0];
    v = removeArray(v[1]);

    switch (key) {
    case 'status':
    case 'language':
    case 'mpris:artUrl':
    case 'mpris:trackid':
    case 'vlc:publisher':
    case 'vlc:encodedby':
    case 'vlc:copyright':
    case 'xesam:genre':
    case 'xesam:contentCreated':
    case 'xesam:tracknumber':
    case 'xesam:album':
      break;
    case 'xesam:url':
      that.setState({info: {url: v}});
      break;
    case 'xesam:title':
      that.setState({info: {title: v}});
      break;
    case 'xesam:comment':
      that.setState({info: {comment: v}});
      break;
    case 'xesam:artist':
      that.setState({info: {artist: v}});
      break;
    case 'vlc:nowplaying':
      that.setState({info: {nowplaying: v}});
      break;
    case 'mpris:length':
      if (v <= 0 || v >= 18446744073709552000) {
        that.setState({pos: null});
      } else {
        that.setState({pos: {length: v / 1000000}});
        getPos(that);
      }
      break;
    case 'vlc:length':
    case 'vlc:time':
      if (v <= 0) that.setState({pos: null});
      break;
    default:
      O.log.unhandled('VLC metadata', {key: key, value: v});
    }
  }
};

function openUri(that, uri) {  // {{{2
//  console.log('VLC OPEN URI', uri);

  if (typeof uri !== 'string') {
    O.log.unhandled('Invalid uri', uri);
  } else {
    that.object && that.object.OpenUri(uri, function(err) {
//      console.log('VLC OPEN URI RESPONSE', arguments);
      if (err) {
        O.log.error(err);
      }
    });
  }
};

function getObject(that, params, cb) {  // {{{2
//  console.log('VLC GET OBJECT', that.identify(), that.object);

  var counter;

  if (! cb) {  // We can pass only callback without params to this function.
    cb = params;
    params = {};
  }

  /*
  if (! VlcVersion) {
    cb(O.error('VLC_VERSION_NOT_RECOGNIZED'));
    return;
  }
  */

  if (! that.core) {
    checkPs();
    return;
  }

  that.props.Get('org.mpris.MediaPlayer2', 'Identity', function(err, value) {
    if (err) {
      that.core.$();
      that.object.$();
      that.props.$();

      delete that.core;
      delete that.object;
      delete that.props;

      checkPs();
    } else {
      cb();
    }
  });
  return;

  function checkPs(err, stdout, stderr) {  // {{{3
    Process.exec('ps -x', onPs);
  }

  function onPs(err, stdout, stderr) {  // {{{3
    if (err) {
      cb(err);
    } else {
      readPs(stdout.split('\n'));
    }
  }

  function readPs(stdout) {  // {{{3
    for (var i = 0; i < stdout.length; i++) {
      var match = stdout[i].match(MatchVlc);

      if (match) {
        connectVlc(match[1]);
        return;
      }
    }

    if (! (params && params.noStart)) {
      runVlc();
      return;
    }

    cb();
    return;
  }

  function runVlc() {  // {{{3
    O.log.notice('Starting VLC process');
    /*
    Process.exec('killall vlc', doRun);
  };

  function doRun() {  // {{{3
  */
    var args = [
      '--control', 'dbus',
//      '--intf', 'qt4',
      '--qt-start-minimized',
      '--no-qt-error-dialogs',
      '--no-interact',

/*
      '--qt-minimal-view',
      '--qt-notification', '2',
      '--qt-fullscreen-screennumber',  TODO: support multiple displays
      '--fullscreen',

      '--extraintf', 'http',
      '--http-host', '127.0.0.1',
      '--http-port', '4439',
      '--http-user', 'ose',
      '--http-password', '',  // TODO: generate password, or use some configured one
*/

      '--no-auto-preparse',
      '--no-video-title-show',
    ];

    if (that.state.shuffle) {
      args.push('--random');
    }

    var handle = Process.spawn('vlc', args);
    handle.stderr.setEncoding('utf8');
    handle.stderr.once('data', function(val) {
      connectVlc(handle.pid);
    });
  }

  function connectVlc(pid) {  // {{{3
    O.log.notice('Connecting to VLC process', pid);

    if (that.pid) {
      quit(that);
    }

    that.pid = pid;

    /*
    // TODO Test in different distributions
    if (VlcVersion >= 2.2) {
      var name = 'org.mpris.MediaPlayer2.vlc';
    } else if (VlcVersion >= 2.1) {
      var name = 'org.mpris.MediaPlayer2.vlc.instance' + pid;
    } else {
      var name = 'org.mpris.MediaPlayer2.vlc' + '-' + pid;
    }
    */


    try {
      that.bus = Dbus.sessionBus();
    } catch (err) {
      cb(err);
      return;
    }

    that.bus.connection.on('error', onError);
    that.bus.connection.once('connect', onConnect);
  }

  function onError(err) {
    delete that.bus
    cb(err);
  }

  function onConnect() {
    that.bus.connection.removeListener('error', onError);

    that.serviceName ='org.mpris.MediaPlayer2.vlc';
    var svc = that.bus.getService(that.serviceName);

    counter = O.counter();

    counter.inc();
    svc.getInterface('/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2', onCore);
    counter.inc();
    svc.getInterface('/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', onPlayer);
    counter.inc();
    svc.getInterface('/org/mpris/MediaPlayer2', 'org.freedesktop.DBus.Properties', onProps);

    counter.done(done);
  };

  function onCore(err, object) {  // {{{3
    if (err) {
      quit(that);
      counter.dec(err);
      return;
    }

    that.core = object;
    counter.dec();
    return;
  };

  function onPlayer(err, object) {  // {{{3
    if (err) {
      quit(that);
      counter.dec(err);
      return;
    }

    that.object = object;
    object.on('Seeked', onSeeked.bind(that));
    counter.dec();
    return;
  };

  function onProps(err, iface) {  // {{{3
    if (err) {
      quit(that);
      counter.dec(err);
      return;
    }

    that.props = iface;
    iface.on('PropertiesChanged', propertyChanged.bind(that));
    iface.Get('org.mpris.MediaPlayer2.Player', 'CanPause', onCanPause.bind(that));
    iface.Get('org.mpris.MediaPlayer2.Player', 'CanSeek', onCanSeek.bind(that));
    iface.Get('org.mpris.MediaPlayer2.Player', 'CanGoPrevious', onCanGoPrevious.bind(that));
    iface.Get('org.mpris.MediaPlayer2.Player', 'CanGoNext', onCanGoNext.bind(that));
    iface.Get('org.mpris.MediaPlayer2', 'CanSetFullScreen', onCanSetFullscreen.bind(that));

    counter.dec();
    return;
  };

  function done(err) {  // {{{3
    if (that.removed) quit(that);

    cb(err);
  };

  // }}}
};

function quit(that) {   // {{{2
//  console.log('QUITTING', that.id);

//  that.object && that.object.Stop();

  if (that.props) {
    that.props.PropertiesChanged.off();
    that.props.$();
    delete that.props;
  }

  if (that.object) {
    that.object.$();
    delete that.object;
  }

  if (that.core) {
    that.core.Quit();
    that.core.$();
    delete that.core;
  }

  if (that.pid) {
    try {
// TODO      process.kill(that.pid, 'SIGKILL');
    } catch (err) {
      O.log.error(err)
    }
    delete that.pid;
  }

  that.setState({
    status: 'stopped',
    pos: null,
    can: null,
    info: null,
  });
}

function getMetadata(that) {   // {{{2
  that.props.Get('org.mpris.MediaPlayer2.Player', 'Metadata', function(err, value) {
    if (err) {
      O.log.unhandled(err);
    } else {
      readMetadata(that, value[1][0]);
    }
  });
};

function getPos(that) {   // {{{2
  that.object.Position(function(err, pos) {
    if (err) {
      O.log.unhandled(err);
    } else {
      if (pos || that.state.pos && that.state.pos.length) {
        that.setState({pos: {
          value: pos / 1000000,
          at: new Date().getTime()
        }});
      }
    }
  });
};

function getShuffle(that) {   // {{{2
  that.object.Shuffle(function(err, value) {
    if (err) {
      O.log.unhandled(err);
    } else {
      that.setState({shuffle: Boolean(value)});
    }
  });
};

function getFullscreen(that) {   // {{{2
  that.core.Fullscreen(function(err, value) {
    if (err) {
      O.log.unhandled(err);
    } else {
      that.setState({fullscreen: Boolean(value)});
    }
  });
};

function getStatus(that) {   // {{{2
  that.object.PlaybackStatus(function(err, value) {
//  that.props.Get('org.mpris.MediaPlayer2.Player', 'PlaybackStatus', function(err, resp) {
    if (err) {
      O.log.unhandled(err);
    } else {
      readStatus(that, value);
    }
  });
};

function readStatus(that, value) {  // {{{2
  switch (value) {
  case 'Playing':
    that.setState({status: 'playing'});
    getPos(that);
    return;
  case 'Paused':
    that.setState({status: 'paused'});
    getPos(that);
    return;
  case 'Stopped':
    that.setState({
      status: 'stopped',
      pos: null,
      info: null,
    });
    return;
  }

  O.log.unhandled('Unexpected playback status.', value);
}

function removeArray(value) {  // {{{2
  value = value[1][0];

  if (Array.isArray(value)) {
    switch (value.length) {
    case 0:
      return null;
    case 1:
      value = value[0];
      break;
    default:
      O.log.unhandled('Expected array length is 1', value);
      value = value[0];
      break;
    }
  }

  switch (typeof value) {
  case 'string':
    value = value.trim();
    if (! value) {
      return null;
    }

    break;
  }

  return value;
};

// }}}1



/* OBSOLETE {{{1
function getVersion(cb) {  // {{{2
  Process.exec('vlc --version', function(err, stdout, stderr) {
    if (err) {
      cb(err);
      return;
    }

    var data = stdout.split('\n');

    for (var i = 0; i < data.length; i++) {
      if (! data[i]) continue;

      var match = data[i].match(/VLC version (\d+\.\d+)/);

      if (match) {
        try {
          var data = parseFloat(match[1]);
        } catch (err) {
          cb(err);
          return;
        }

        cb(null, data);
        return;
      }
    }

    cb(O.error('VLC_VERSION_NOT_RECOGNIZED', stdout));
    return;
  });
};

}}}1 */
