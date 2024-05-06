/// <reference path="./p5.global-mode.d.ts" />

// p5.disableFriendlyErrors = false;

Math.randRange = (start, stop) => {
  if (start > stop) [start, stop] = [stop, start];
  return start + Math.random() * (stop - start);
};
Math.randColor = () => {
  return [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)];
}
Math.distance = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
Math.clamp = (v, min, max) => Math.min(max, Math.max(min, v));

import {World, CHUNK_NUMBER, CHUNK_SIZE} from './src/world.js';
import {Camera} from './src/camera.js';
import * as assets from './src/assets.js';
import {EntityHuman} from './src/entities.js';
import {generateKingdomName, generateMotto} from "./src/nomenclature.js";

let width, height, minWidthHeight;

let world, camera;

let fpsValues = []; // Array to store FPS values
let lastCaptureTime = 0; // Time of the last FPS capture

new p5(/** @param {p5} p5 */(p5) => {
  p5.preload = () => {
    assets.loadSprites(p5);
  }

  p5.setup = () => {
    for (let element of document.getElementsByClassName("p5Canvas")) {
      element.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    width = window.innerWidth;
    height = window.innerHeight;
    minWidthHeight = Math.min(width, height);
    world = new World(p5, CHUNK_NUMBER, CHUNK_SIZE);
    camera = new Camera(p5, world, -width / 2, -height / 2);
    world.camera = camera;

    p5.createCanvas(width, height);
//    p5.rectMode(p5.CENTER);
    p5.imageMode(p5.CENTER);
    p5.noStroke();
    p5.noSmooth();
    p5.frameRate(60);
  }

  p5.draw = () => {
    p5.background(0);

    let dx = 0, dy = 0;
    if (p5.keyIsDown(65)) dx--;
    if (p5.keyIsDown(68)) dx++;
    if (p5.keyIsDown(87)) dy--;
    if (p5.keyIsDown(83)) dy++;
    camera.update(width, height);
    camera.move(dx, dy);
    camera.draw(minWidthHeight * 0.75);

    world.eventScheduler.tick();

    if (p5.millis() - lastCaptureTime > 100) {
      fpsValues.push(p5.frameRate()); // Add current FPS to array
      lastCaptureTime = p5.millis(); // Update last capture time

      // Remove FPS values older than 5 seconds
      while (fpsValues.length > 0 && p5.millis() - fpsValues[0].time > 5000) {
        fpsValues.shift();
      }
    }

    p5.push();
    p5.resetMatrix();
    p5.fill(255);
    let totalFPS = fpsValues.reduce((total, fps) => total + fps, 0);
    let averageFPS = fpsValues.length > 0 ? totalFPS / fpsValues.length : 0;
    p5.text('FPS: ' + averageFPS, 20, 20);
    p5.pop();
  }

  p5.mousePressed = event => {
    const [cx, cy] = camera.screenToCoordinates(p5.mouseX, p5.mouseY);
    const px = Math.round(cx);
    const py = Math.round(cy);

    if (px >= 0 && px < world.worldSize && py >= 0 && py < world.worldSize) {
      if (event.button === 0) {
        world.spawnEntity(new EntityHuman(world, px, py));
      } else if (event.button === 2) {
//        world.entities.filter(entity => entity.ai).forEach(entity => entity.ai.setTarget(px, py));
        console.log(`${generateKingdomName()}: "${generateMotto()}"`);
      }
    }
  }

  p5.mouseWheel = event => {
    if (typeof camera !== 'undefined') camera.scrollZoom(event.delta);
  }

  p5.windowResized = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    minWidthHeight = Math.min(width, height);
    p5.resizeCanvas(width, height);
  }
});
