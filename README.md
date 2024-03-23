# dyna (beta)
updater for revite plugins, manager coming as soon as the API is stabilized (aka. in a few months)

## why dyna

i was annoyed at the fact that i had to send my plugin each time i made a change

it was also highly requested too

## installing it

open the console

type `state.plugins.add()`, then copy the contents of this repo's `plugin.json` and paste them inside the parenthesis

dyna does not have a ui yet

it also triggers every hour or so

## auto updating with dyna

- add a `dyna.json` file with the following contents:
```jsonc
{
  "latest": 1, // version that dyna will compare to
  "target": "target/plugin.json" // (optional) location of the plugin inside the repo
}
```
- add a dyna object to your plugin's manifest with the following:
```jsonc
{
  // ...
  "dyna": {
    "repo": "username/gh-repo",
    "shouldRestart": false // reload the entire client after update
  }
}
```

that's it
quite literally

info: this might change in the future

## spec

### dyna manifest

`version`: plugin's current version (INT)

`latest`: latest available version from git forge (INT)

`dev`: plugin is on dev mode (BOOLEAN, OPTIONAL)

`repo`: plugin's repository (STRING)

`shouldRestart`: restart client after update (BOOLEAN)

### dyna api

`version`: plugin's current version (INT)

`latest`: latest available version from git forge (INT)

`dev`: plugin is on dev mode (BOOLEAN)

`repo`: plugin's repository (STRING)

`shouldRestart`: restart client after update (BOOLEAN)

`author`: plugin's author (STRING)

`id`: plugin id (STRING)

## caveats

- doesn't support other git providers/forges
- no manager
- two files to allow updates
- no dependency management
- no manual updates
- etc, etc, etc
- just check the road map to see what is missing
- feature requests welcome :)

## roadmap

- [x] proof-of-concept updater
- [x] release cod
- [ ] updater v1
  - [x] allow other plugins to see dyna-compatible plugins
  - [ ] merge dyna.json with manifest.json
  - [x] update indicator
  - [x] manual updates for other plugins
  - [ ] update check without downloading plugin
- [ ] manager v1
  - [ ] allow downloading other plugins in-app
  - [ ] make central repo with dyna manifests
  - [ ] manual update toggle per plugin (by user)
  - [ ] manual update button
- [ ] updater v2
  - [ ] allow other git providers such as gitea and forgejo
  - [ ] dependencies
    - [ ] download
  - [ ] event emitters for other plugins to listen to
  - [ ] deprecation notice warning
  - [ ] self-update
  - [ ] plugin types
- [ ] manager v2
  - [ ] paste url to download
  - [ ] search per author
  - [ ] dependency listing
  - [ ] display plugin types

## contributing

uhhhh

just don't do malicious code and be friendly to others inside issues/pull requests/etc

## licence

project licenced under the mit licence as usual
