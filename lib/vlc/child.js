'use strict';

var Vlc = require('vlc');

var Main = new Vlc([
  '-intf', 'dummy',
  /*
  '-I', 'http',
//'--http-host', '127.0.0.1',
  '--http-host', '10.166.25.8',
  '--http-port', '4439',
  '--http-user', 'ose',
  '--http-password', 'ossee',
  */
  '--no-video-title-show',
  '--no-auto-preparse',
  '--fullscreen',
]);

var Player = Main.mediaplayer;

// {{{1
Player.on('MediaChanged', function() {  // {{{2
//  console.log('MediaChanged', arguments);

  var media = Player.media;

  if (! media) return;

  media.on('MetaChanged', function(name) {  // {{{3
//    console.log('MetaChanged', arguments);

    /*
    media.parseSync();
    Player.media.parseSync();

    if (Player.media !== media) {
      return;
    }
    */

    process.send({
      type: 'meta',
      name: name,
      value: media[name],
    });
/*
    return;
    */
  });

  media.on('SubItemAdded', function(sub) {  // {{{3
    console.log('SubItemAdded', sub);

//    Player.media = med;
  });

  media.on('DurationChanged', function(val) {  // {{{3
//    console.log('DurationChanged', arguments);

    if (val) {
      process.send({
        type: 'pos',
        length: val / 1000,
        pos: Player.getPosition(),
      });
    } else {
      process.send({
        type: 'pos',
        length: 0,
      });
    }
  });

  media.on('StateChanged', function(val) {  // {{{3
    console.log('StateChanged', arguments);
  });

  // }}}3

  /*
  media.on('ParsedChanged', function() {  // {{{3
    console.log('ParsedChanged', arguments);
  });

  media.on('Freed', function() {  // {{{3
    console.log('Freed', arguments);
  });

  // }}}3
  */
});

Player.on('NothingSpecial', function() {  // {{{2
  console.log('NothingSpecial', arguments);
});

Player.on('Opening', function() {  // {{{2
//  console.log('Opening', arguments);

  process.send({
    type: 'status',
    value: 'stopped',
  });
});

Player.on('Buffering', function() {  // {{{2
//  console.log('Buffering', arguments);
});

Player.on('Playing', function() {  // {{{2
//  console.log('Playing', arguments);

  process.send({
    type: 'status',
    value: 'playing',
  });
});

Player.on('Paused', function() {  // {{{2
//  console.log('Paused', arguments);

  process.send({
    type: 'status',
    value: 'paused',
  });
});

Player.on('Stopped', function() {  // {{{2
//  console.log('Stopped', arguments);

  process.send({
    type: 'status',
    value: 'stopped',
  });
});

Player.on('Forward', function() {  // {{{2
  console.log('Forward', arguments);
});

Player.on('Backward', function() {  // {{{2
  console.log('Backward', arguments);
});

Player.on('EndReached', function() {  // {{{2
//  console.log('EndReached', arguments);

  process.send({
    type: 'status',
    value: 'stopped',
  });
});

Player.on('EncounteredError', function() {  // {{{2
  console.log('EncounteredError', arguments);
});

/*
Player.on('TimeChanged', function() {  // {{{2
  console.log('TimeChanged', arguments);
});

Player.on('PositionChanged', function() {  // {{{2
  console.log('PositionChanged', arguments);
});
*/

Player.on('SeekableChanged', function(val) {  // {{{2
//  console.log('SeekableChanged', arguments);

  process.send({
    type: 'can',
    name: 'seek',
    value: val,
  });
});

Player.on('PausableChanged', function(val) {  // {{{2
//  console.log('PausableChanged', arguments);

  process.send({
    type: 'can',
    name: 'pause',
    value: val,
  });
});

Player.on('TitleChanged', function() {  // {{{2
  console.log('TitleChanged', arguments);
});

Player.on('SnapshotTaken', function() {  // {{{2
  console.log('SnapshotTaken', arguments);
});


Player.on('Vout', function() {  // {{{2
  console.log('Vout', arguments);
});

process.on('message', function(m) {  // {{{2
  switch (m.type) {
  case 'quit':
    Main.media.release();
    Player.release();
    Main.release();
    process.exit(0);
    return;
  case 'playUrl':
    if (Player.media) {
      Player.media.release();
//      Player.media = null;
    }
    Player.media = Main.mediaFromUrl(m.url);
    Player.play();
    return;
  }

  console.log('UNHANDLED MESSAGE', m);
  return;
});

process.on('disconnect', function() {  // {{{2
  process.exit(0);
});

/*Player.on('LengthChanged', function() {  // {{{2
  console.log('LengthChanged', arguments);
});

*/
// }}}1

process.send('started');

