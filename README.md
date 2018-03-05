# kakoune electron

A [kakoune](http://kakoune.org) GUI made in [electron](https://electronjs.org).

It's currently only a *Proof Of Concept* repository.
In these very early stages of development expect to see weird/breaking stuffs.

## Why?

Electron has a reputation of being "bloated" and "eating all RAM". So what would be the benefit over
the native ncurses UI of kakoune which already works very well?

The goal of this project is more to serve as a platform to experiment with new UI paradigms, in regards of the
modal and multi-selections nature of kakoune.

So the first milestone is to be able to mimic the current terminal layout.
Then, in another branch probably, the second step will be to try new ideas taking inspiration
on what's being done by [neovim's frontends](https://github.com/neovim/neovim/wiki/Related-projects#gui) or more featured IDE like VsCode.

## Install

`npm i && npm run build`

## Usage

`npm start`

## Dev

`npm dev`: DevTools will be automatically opened at startup.

## Under the hood

At the moment the implementation is very naïve, but it works surprisingly nice enough.
A `kak` child process is spawned by `node` and the communication is established through the
[`JSON-RPC` api](https://github.com/mawww/kakoune/blob/master/doc/json_ui.asciidoc).

On the rendering side, the drawing of the various elements is done with a bunch of `<canvas>` elements.

An alternative renderer is made with `react`.
