# Open Smart Environment VideoLAN package

This package contains [entry kinds] integrating VideoLAN software
into OSE.

It allows the [OSE Media player] to use VLC as its playback
application and DVBlast as its DVB streamer.

## Status
- Pre-alpha stage (insecure and buggy)
- Unstable API
- Gaps in the documentation
- No test suite

This is not yet a piece of download-and-use software. Its important
to understand the basic principles covered by this documentation.

Use of this software is currently recommended only for users that
wish participate in the development process (see Contributions).

TODO: Make contribution a link

## Getting started
To get started with OSE, refer to the [ose-bundle] package and
[Media player example application].

## Modules
Open Smart Environment VideoLAN package consists of the following modules:
- DVBlast kind
- DVBlast response socket
- VLC kind
- OSE VideoLAN core
- OSE VideoLAN content

### DVBlast kind
[Entry kind] allowing to control DVBlast software

Module [DVBlast kind] reference ... 

### DVBlast response socket
[Response socket] relaying the switch entry events to the client.

TODO

Module [DVBlast response socket] reference ... 

### VLC kind
[Entry kind] allowing to control VLC

Module [VLC kind] reference ... 

### OSE VideoLAN core
Core singleton of ose-videolan npm package. Registers [entry kinds]
defined by this package to the `"control"` [scope].

Module [OSE VideoLAN core] reference ... 

### OSE VideoLAN content
Provides files of OSE VideoLAN package to the browser.

Module [OSE VideoLAN content] reference ... 

## Contributions
To get started contributing or coding, it is good to read about the
two main npm packages [ose] and [ose-bb].

This software is in the pre-alpha stage. At the moment, it is
premature to file bugs. Input is, however, much welcome in the form
of ideas, comments and general suggestions.  Feel free to contact
us via
[github.com/opensmartenvironment](https://github.com/opensmartenvironment).

## License
This software is licensed under the terms of the [GNU GPL version
3](../LICENCE) or later
