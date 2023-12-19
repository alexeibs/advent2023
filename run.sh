#!/bin/bash

set -e

latest_script=`ls day*ts | tail -1 | sed -e 's/ts/js/'`
latest_example=`ls day*ts | tail -1 | sed -e 's/ts/example/'`
latest_input="inputs/`ls day*ts | tail -1 | sed -e 's/ts/input/'`"

npm run all

touch $latest_example
node $latest_script < $latest_example

touch $latest_input
node $latest_script < $latest_input
