#!/bin/bash

find ./files -type f -not -name '*original.wav' -delete
find ./files -type d -empty -delete
