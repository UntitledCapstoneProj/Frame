#!/bin/bash
mkdir nodejs
cd nodejs
npm init -y
npm install pg
cd ..
zip -r lambda-layer.zip nodejs
