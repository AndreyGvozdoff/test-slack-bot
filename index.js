const express = require("express");
const path = require("path");
const PORT = process.env.port || 5000;

express().listen(PORT, () => console.log(`Listening on ${port}`));
