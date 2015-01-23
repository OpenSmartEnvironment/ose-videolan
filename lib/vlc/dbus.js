'use strict';

var Ose = require('ose');
var M = Ose.module(module);

var Process = require('child_process');
var Dbus = require('ndbus');

/** Docs {{{1
 * @module videolan
 */

/**
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

  entry.on('remove', onRemove.bind(entry));

  if (VlcVersion) {
    doIt();
  } else {
    getVersion(doIt);
  }

  function doIt(err, version) {
    if (err) {
      M.log.error(entry, err);
      return;
    }

    if (version) {
      VlcVersion = version;
    }

    getObject(entry, function(err) {
      if (err) {
        M.log.error(err);
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
/**
 * [Command handler]
 *
 * Play media from URI.
 *
 * @param req {String} Media URI
 *
 * @method playUri
 */

  var e = this.entry;

  getObject(e, function(err) {
    if (err) {
      Ose.link.error(socket, err);
    } else {
      openUri(e, req);
      Ose.link.close(socket);
    }
  });
};

function play(req) {  // {{{2
/**
 * [Command handler]
 *
 * Play
 *
 * @method play
 */

  this.entry.object && this.entry.object.Play();
};

function pause(req) {  // {{{2
/**
 * [Command handler]
 *
 * Pause playback
 *
 * @method pause
 */

  this.entry.object && this.entry.object.Pause();
};

function stop(req) {  // {{{2
/**
 * [Command handler]
 *
 * Stop playback
 *
 * @method stop
 */

//  console.log('VLC STOP', req);

  this.entry.object && this.entry.object.Stop();
};

function turnOff(req) {  // {{{2
/**
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
/**
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
/**
 * [Command handler]
 *
 * Raises window
 *
 * @method raise
 */

  this.entry.core.Raise();
};

function shuffle(req, socket) {  // {{{2
/**
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
/**
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
/**
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
/**
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
function onRemove(data) {  // {{{2
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
      M.log.unhandled('Unexpected property change.', {key: key, value: value});
    }
  }
}

// }}}1
// Private {{{
var VlcVersion = '';
var MatchVlc = /^\s*(\d+)\s.+\s.+\s.+\s+vlc.*--control.*dbus/;

function readMetadata(that, data) {  // {{{2
//  console.log('READ META', data);

  if (that.clearInfo) {
    delete that.clearInfo;
    that.setState({info: null});
  }

  for (var key in data) {
    var value = removeArray(data[key]);

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
      that.setState({info: {url: value}});
      break;
    case 'xesam:comment':
      that.setState({info: {comment: value}});
      break;
    case 'xesam:artist':
      that.setState({info: {artist: value}});
      break;
    case 'xesam:title':
      that.setState({info: {title: value}});
      break;
    case 'vlc:nowplaying':
      that.setState({info: {nowplaying: value}});
      break;
    case 'mpris:length':
      //        console.log('MPRIS LENGTH', value);

      if (value <= 0) {
        that.setState({pos: null});
      } else {
        that.setState({pos: {length: value / 1000000}});
        getPos(that);
      }
      break;
    case 'vlc:length':
      //        console.log('VLC LENGTH', value);
      //        that.setState({pos: {length: value / 1000}});
      break;
    case 'vlc:time':
      //        console.log('VLC TIME', value);
      //        that.setState({pos: {length: value}});
      getPos(that);
      break;
    default:
      M.log.unhandled('Metadata', {key: key, value: value});
    }
  }
};

function openUri(that, uri) {  // {{{2
//  console.log('VLC OPEN URI', uri);

  if (typeof uri !== 'string') {
    M.log.unhandled('Invalid uri', uri);
  } else {
    that.object && that.object.OpenUri(uri, function(err) {
//      console.log('VLC OPEN URI RESPONSE', arguments);
      if (err) {
        M.log.error(err);
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

  if (! VlcVersion) {
    cb(Ose.error('VLC_VERSION_NOT_RECOGNIZED'));
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
    M.log.notice('Starting VLC process');
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
    handle.stderr.once('data', function(data) {
      connectVlc(handle.pid);
    });
  }

  function connectVlc(pid) {  // {{{3
    M.log.notice('Connecting to VLC process', pid);

    if (that.pid) {
      quit(that);
    }

    that.pid = pid;

    counter = Ose.counter(done);

    var bus = Dbus();

    // TODO Test in different distributions
    if (VlcVersion >= 2.2) {
      var name = 'org.mpris.MediaPlayer2.vlc';
    } else if (VlcVersion >= 2.1) {
      var name = 'org.mpris.MediaPlayer2.vlc.instance' + pid;
    } else {
      var name = 'org.mpris.MediaPlayer2.vlc' + '-' + pid;
    }

    counter.inc();
    bus.proxy(name, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2', onCore);
    counter.inc();
    bus.proxy(name, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', onPlayer);
    counter.inc();
    bus.proxy(name, '/org/mpris/MediaPlayer2', 'org.freedesktop.DBus.Properties', onProps);

    counter.dec();
  };

  function onCore(err, object) {  // {{{3
    if (err) {
      M.log.error(err);
      quit(that);
    } else {
      that.core = object;
    }

    counter.dec();
  };

  function onPlayer(err, object) {  // {{{3
    if (err) {
      M.log.error(err);
      quit(that);
    } else {
      that.object = object;
    }

    counter.dec();
  };

  function onProps(err, object) {  // {{{3
    if (err) {
      M.log.error(err);
      quit(that);
    } else {
      that.props = object;
      object.PropertiesChanged.on(propertyChanged.bind(that));
      object.Get('org.mpris.MediaPlayer2.Player', 'CanPause', onCanPause.bind(that));
      object.Get('org.mpris.MediaPlayer2.Player', 'CanSeek', onCanSeek.bind(that));

      // Optional mpris props not currently supported by VLC:
      object.Get('org.mpris.MediaPlayer2.Player', 'CanGoPrevious', onCanGoPrevious.bind(that));
      object.Get('org.mpris.MediaPlayer2.Player', 'CanGoNext', onCanGoNext.bind(that));
      object.Get('org.mpris.MediaPlayer2', 'CanSetFullScreen', onCanSetFullscreen.bind(that));
    }

    counter.dec();
  };

  function done(err) {  // {{{3
//    console.log('DONE', that.id);

    if (that.removed) quit(that);

    cb();
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
      process.kill(that.pid, 'SIGKILL');
    } catch (err) {
      M.log.error(err)
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
    Ose.link.close(socket);
  }
};

function setPropPlayer(entry, socket, name, val) {  // {{{2
  if (entry.props) {
    entry.props.Set('org.mpris.MediaPlayer2.Player', name, val);
  }

  if (socket) {
    Ose.link.close(socket);
  }
};

function getMetadata(that) {   // {{{2
  that.props.Get('org.mpris.MediaPlayer2.Player', 'Metadata', function(err, value) {
    if (err) {
      M.log.unhandled(err);
    } else {
      readMetadata(that, value);
    }
  });
};

function getPos(that) {   // {{{2
  that.props.Get('org.mpris.MediaPlayer2.Player', 'Position', function(err, pos) {
    if (err) {
      M.log.unhandled(err);
    } else {
      that.setState({pos: {
        value: pos / 1000000,
        at: new Date().getTime()
      }});
    }
  });
};

function getShuffle(that) {   // {{{2
  that.props.Get('org.mpris.MediaPlayer2.Player', 'Shuffle', function(err, value) {
    if (err) {
      M.log.unhandled(err);
    } else {
      that.setState({shuffle: Boolean(value)});
    }
  });
};

function getFullscreen(that) {   // {{{2
  that.props.Get('org.mpris.MediaPlayer2', 'Fullscreen', function(err, value) {
    if (err) {
      M.log.unhandled(err);
    } else {
      that.setState({fullscreen: Boolean(value)});
    }
  });
};

function getStatus(that) {   // {{{2
  that.props.Get('org.mpris.MediaPlayer2.Player', 'PlaybackStatus', function(err, resp) {
    if (err) {
      M.log.unhandled(err);
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
    M.log.unhandled('Unexpected playback status.', value);
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
      M.log.unhandled('Expected array length is 1', value);
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

    cb(Ose.error('VLC_VERSION_NOT_RECOGNIZED', stdout));
    return;
  });
};

// }}}1
