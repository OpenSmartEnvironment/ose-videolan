'use strict';

const O = require('ose')(module);

var Process = require('child_process');
var Dbus = require('ndbus');
//var Dbus = require('dbus-native');

/* Docs {{{1
 * @module videolan
 */

/*
 * Implementation of media player playback using VLC over D-Bus
 *
 * @class videolan.lib.vlc
 */

// Public {{{1
exports.init = function() {  // {{{2
  this.on({
    play: play,
    playUri: playUri,
    pause: pause,
    stop: stop,
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
  entry.sval = {};

  entry.on('remove', onRemove.bind(entry));

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
  }
};

// }}}1
// Command handlers {{{1
function playUri(req, socket) {  // {{{2
/*
 * [Command handler]
 *
 * Play media from URI.
 *
 * @param req {String} Media URI
 *
 * @method playUri
 */

  var e = this.entry;

  this.entry.clearInfo = true;
  getObject(e, function(err) {
    if (err) {
      O.link.error(socket, err);
    } else {
      openUri(e, req);
      O.link.close(socket);
    }
  });
};

function play(req) {  // {{{2
/*
 * [Command handler]
 *
 * Play
 *
 * @method play
 */

  this.entry.clearInfo = true;
  this.entry.object && this.entry.object.Play();
};

function pause(req) {  // {{{2
/*
 * [Command handler]
 *
 * Pause playback
 *
 * @method pause
 */

  this.entry.object && this.entry.object.Pause();
};

function stop(req, socket) {  // {{{2
/*
 * [Command handler]
 *
 * Stop playback
 *
 * @method stop
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
/*
 * [Command handler]
 *
 * Turns the player off.
 *
 * @param req None
 *
 * @method turnOff
 */

  quit(this.entry);
};

function fullscreen(req, socket) {  // {{{2
/*
 * [Command handler]
 *
 * Toggles fullscreen
 *
 * @param req {Object} Fullscreen?
 *
 * @method fullscreen
 */

  setProp(this.entry, socket, 'Fullscreen', req);
};

function raise(req) {   // {{{2
/*
 * [Command handler]
 *
 * Raises window
 *
 * @method raise
 */

  this.entry.core.Raise();
};

function shuffle(req, socket) {  // {{{2
/*
 * [Command handler]
 *
 * Toggles shuffle mode
 *
 * @param req {Boolean} Shuffle?
 *
 * @method shuffle
 */

  setPropPlayer(this.entry, socket, 'Shuffle', req);

//  this.entry.setState({shuffle: req});
};

function seek(req) {  // {{{2
/*
 * [Command handler]
 *
 * Seek media
 *
 * @param req {Number} Position in microseconds
 *
 * @method seek
 */

  if (this.entry.object) {
    this.entry.object.Seek(req);
    getPos(this.entry);
  }
};

function next(req) {  // {{{2
/*
 * [Command handler]
 *
 * Skip to next media
 *
 * @param req {Object} Request object TODO
 *
 * @method next
 */

  if (this.entry.object) {
    this.entry.clearInfo = true;
    this.entry.object.Next();
  }
};

function previous(req) {  // {{{2
/*
 * [Command handler]
 *
 * Skip to previous media
 *
 * @param req {Object} Request object TODO
 *
 * @method previous
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

function propertyChanged(iface, props) {  // {{{2
  for (var key in props) {
    var value = props[key];

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
var VlcVersion = '';
var MatchVlc = /^\s*(\d+)\s.+\s.+\s.+\s+vlc.*--control.*dbus/;

function readMetadata(that, val) {  // {{{2
//  console.log('READ META', val);

  if (that.clearInfo) {
    delete that.clearInfo;
    that.setState({info: null});
  }

  for (var key in val) {
    var v = removeArray(val[key]);

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
    case 'xesam:comment':
      that.setState({info: {comment: v}});
      break;
    case 'xesam:artist':
      that.setState({info: {artist: v}});
      break;
    case 'xesam:title':
      that.setState({info: {title: v}});
      break;
    case 'vlc:nowplaying':
      that.setState({info: {nowplaying: v}});
      break;
    case 'mpris:length':
      //        console.log('MPRIS LENGTH', v);

      if (v <= 0) {
        that.setState({pos: null});
      } else {
        that.setState({pos: {length: v / 1000000}});
        getPos(that);
      }
      break;
    case 'vlc:length':
      //        console.log('VLC LENGTH', v);
      //        that.setState({pos: {length: v / 1000}});
      break;
    case 'vlc:time':
      //        console.log('VLC TIME', v);
      //        that.setState({pos: {length: v}});
      getPos(that);
      break;
    default:
      O.log.unhandled('Metadata', {key: key, value: v});
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
//  console.log('VLC GET OBJECT', that.toString(), that.object);

//  var counter;

  if (! cb) {  // We can pass only callback without params to this function.
    cb = params;
    params = {};
  }

  if (! VlcVersion) {
    cb(O.error('VLC_VERSION_NOT_RECOGNIZED'));
    return;
  }

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

    if (that.sval.shuffle) {
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

    throw O.log.todo();

//    counter = O.counter();

    // TODO Test in different distributions
    if (VlcVersion >= 2.2) {
      var name = 'org.mpris.MediaPlayer2.vlc';
    } else if (VlcVersion >= 2.1) {
      var name = 'org.mpris.MediaPlayer2.vlc.instance' + pid;
    } else {
      var name = 'org.mpris.MediaPlayer2.vlc' + '-' + pid;
    }

    console.log('DBUS SERVICE', name);

    /*
    var address = 'unix:abstract=/tmp/dbus-y9xtamKBCl,guid=5a41818cac5591dd5e67e647551a8b70';
    var bus = Dbus.sessionBus({busAddress: address});
    var svc = bus.getService(name);
    counter.inc();
    svc.getInterface('/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2', onCore);
    counter.inc();
    svc.getInterface('/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', onPlayer);
    counter.inc();
    svc.getInterface('/org/mpris/MediaPlayer2', 'org.freedesktop.DBus.Properties', onProps);
    */

    /*
    var bus = Dbus();
    counter.inc();
    bus.proxy(name, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2', onCore);
    counter.inc();
    bus.proxy(name, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', onPlayer);
    counter.inc();
    bus.proxy(name, '/org/mpris/MediaPlayer2', 'org.freedesktop.DBus.Properties', onProps);

    counter.done(done);
    */
  };

  function onCore(err, object) {  // {{{3
    if (err) {
      quit(that);
//      counter.dec(err);
      return;
    }

    that.core = object;
//    counter.dec();
    return;
  };

  function onPlayer(err, object) {  // {{{3
    if (err) {
      quit(that);
//      counter.dec(err);
      return;
    }

    that.object = object;
//    counter.dec();
    return;
  };

  function onProps(err, object) {  // {{{3
    if (err) {
      quit(that);
//      counter.dec(err);
      return;
    }

    that.props = object;
    object.PropertiesChanged.on(propertyChanged.bind(that));
    object.Get('org.mpris.MediaPlayer2.Player', 'CanPause', onCanPause.bind(that));
    object.Get('org.mpris.MediaPlayer2.Player', 'CanSeek', onCanSeek.bind(that));

    // Optional mpris props not currently supported by VLC:
    object.Get('org.mpris.MediaPlayer2.Player', 'CanGoPrevious', onCanGoPrevious.bind(that));
    object.Get('org.mpris.MediaPlayer2.Player', 'CanGoNext', onCanGoNext.bind(that));
    object.Get('org.mpris.MediaPlayer2', 'CanSetFullScreen', onCanSetFullscreen.bind(that));

//    counter.dec();
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
// TODO enable     process.kill(that.pid, 'SIGKILL');
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

function setProp(entry, socket, name, val) {  // {{{2
  if (entry.props) {
    entry.props.Set('org.mpris.MediaPlayer2', name, val);
  }

  if (socket) {
    O.link.close(socket);
  }
};

function setPropPlayer(entry, socket, name, val) {  // {{{2
  if (entry.props) {
    entry.props.Set('org.mpris.MediaPlayer2.Player', name, val);
  }

  if (socket) {
    O.link.close(socket);
  }
};

function getMetadata(that) {   // {{{2
  that.props.Get('org.mpris.MediaPlayer2.Player', 'Metadata', function(err, value) {
    if (err) {
      O.log.unhandled(err);
    } else {
      readMetadata(that, value);
    }
  });
};

function getPos(that) {   // {{{2
  that.props.Get('org.mpris.MediaPlayer2.Player', 'Position', function(err, pos) {
    if (err) {
      O.log.unhandled(err);
    } else {
      that.setState({pos: {
        value: pos / 1000000,
        at: Date.now()
      }});
    }
  });
};

function getShuffle(that) {   // {{{2
  that.props.Get('org.mpris.MediaPlayer2.Player', 'Shuffle', function(err, value) {
    if (err) {
      O.log.unhandled(err);
    } else {
      that.setState({shuffle: Boolean(value)});
    }
  });
};

function getFullscreen(that) {   // {{{2
  that.props.Get('org.mpris.MediaPlayer2', 'Fullscreen', function(err, value) {
    if (err) {
      O.log.unhandled(err);
    } else {
      that.setState({fullscreen: Boolean(value)});
    }
  });
};

function getStatus(that) {   // {{{2
  that.props.Get('org.mpris.MediaPlayer2.Player', 'PlaybackStatus', function(err, resp) {
    if (err) {
      O.log.unhandled(err);
    } else {
      readStatus(that, resp);
    }
  });
};

function readStatus(that, value) {  // {{{2
  switch (value) {
  case 'Playing':
    that.setState({status: 'playing'});
    getPos(that);

    break;
  case 'Paused':
    that.setState({status: 'paused'});
    getPos(that);

    break;
  case 'Stopped':
    that.setState({
      status: 'stopped',
      pos: null,
      info: null,
    });
    break;
  default:
    O.log.unhandled('Unexpected playback status.', value);
  }
}

function removeArray(value) {  // {{{2
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

function getVersion(cb) {  // {{{2
  Process.exec('vlc --version', function(err, stdout, stderr) {
    if (err) {
      cb(err);
      return;
    }

    var val = stdout.split('\n');

    for (var i = 0; i < val.length; i++) {
      if (! val[i]) continue;

      var match = val[i].match(/VLC version (\d+\.\d+)/);

      if (match) {
        try {
          var v = parseFloat(match[1]);
        } catch (err) {
          cb(err);
          return;
        }

        cb(null, v);
        return;
      }
    }

    cb(O.error('VLC_VERSION_NOT_RECOGNIZED', stdout));
    return;
  });
};

// }}}1
