

import { sleep, rdn, getParameterByName } from './utils.js';
import { executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const playlist_id = process.env.PLAYLIST_ID
const ytApiKey = process.env.YOUTUBE_API_KEY;
const simultaneous = process.env.SIMULTANEOUS;
const headless = process.env.HEADLESS;
const proxyApiKey = process.env.PROXYSCRAPE_API_KEY

async function createBrowser(nb, proxy) {
  try {
    puppeteer.use(StealthPlugin())

    const browser = await puppeteer.launch({
      defaultViewport: null,
      headless: headless,
      args: [
        // '--proxy-server='+proxy,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--user-data-dir=datadir/' + nb,
        '--window-size=1500,2000',
        '--disable-features=site-per-process',
      ],
      ignoreHTTPSErrors: true,
      executablePath: executablePath(),
    });

    return browser;
  } catch (e) {
    console.error(`ERROR BROWSER ${nb} : ${e}`);

    await browser.close();
    fs.rmSync('./datadir/' + nb, { recursive: true, force: true });

    throw e;
  }
}

async function createPage(browser) {
  try {
    let page = await browser.newPage();

    await page.setBypassCSP(true)
    await page.setViewport({ width: 1500, height: 2000 })
    await page.setDefaultNavigationTimeout(30000);

    return page;
  } catch (e) {
    console.error(`ERROR BROWSER PAGE ${nb} : ${e}`);

    throw e;
  }
}

async function getPlaylistItems(playlistId) {
  const result = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems`, {
    params: {
      'part': 'id,snippet',
      'maxResults': 1000,
      'playlistId': playlistId,
      'key': ytApiKey
    }
  });

  return result.data.items;
};

async function getProxies() {
  const result = await axios.get(`https://api.proxyscrape.com/v2/account/datacenter_shared/proxy-list`, {
    headers: { 
      'Accept-Encoding': 'gzip,deflate,compress'
    } ,
    params: {
      'auth': proxyApiKey,
      'type':'getproxies',
      'country[]':'all',
      'protocol':'http',
      'format':'normal',
      'status':'all',
    }
  });
  console.log(result);
  return result.data;
};

async function getRandomVid(playlistId) {
  const vids = await getPlaylistItems(playlistId)

  const videoId = vids[rdn(0, vids.length)].snippet.resourceId.videoId;

  return `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`;
}

async function clickConsent(page, nb) {
  return new Promise((resolve, reject) => {
    const cookieConsentXpath = '//*[@id="content"]/div[2]/div[6]/div[1]/ytd-button-renderer[2]/yt-button-shape';

    page.waitForXPath(cookieConsentXpath).then(async (elem) => {
      const cookieConsentCoordinate = await elem.boundingBox()
      await sleep(rdn(10000, 20000));
      await page.mouse.click(cookieConsentCoordinate.x + 10, cookieConsentCoordinate.y + 10, { button: 'left' });
      console.log(`BROWSER ${nb} - CLICK CONSENT`);
      resolve();
    }).catch((e)=>{
      console.log(`BROWSER ${nb} - CONSENT COOKIE NOT FOUND`);
      resolve();
    });
  })
}

async function clickRandom(page, nb) {
  return new Promise((resolve, reject) => {
    const randomXpath = '//*[@id="top-level-buttons-computed"]/ytd-toggle-button-renderer';

    page.waitForXPath(randomXpath).then(async (elem) => {
      const randomCoordinate = await elem.boundingBox()
      await sleep(rdn(10000, 20000));
      console.log(`BROWSER ${nb} - CLICK RANDOM BUTTON`);
      await page.mouse.click(randomCoordinate.x + 10, randomCoordinate.y + 10, { button: 'left' });
      resolve();
    }).catch((e) => {
      console.log(`BROWSER ${nb} - RANDOM BUTTON NOT FOUND`);
      resolve();
    });
  })
}

async function watchPlaylist(nb) {
  await sleep(rdn(500, 20000));
  const nbRload = 5;
  let url = await getRandomVid(playlist_id);
  console.log("url => ", url)
  let browser = await createBrowser(nb);
  try {
    let page = await createPage(browser);
    console.log(`BROWSER ${nb} - START`);

    page.on("framenavigated", frame => {
      const v = getParameterByName('v', frame.url())
      if (v) {
        console.log(`BROWSER ${nb} - WATCHING ${v}`);
      }
    });

    await page.goto(url);

    clickConsent(page, nb);
    await clickRandom(page, nb);

    for (let i = 0; i < nbRload; i++) {
      console.log(`BROWSER ${nb} - RELOAD`);
      await sleep(rdn(20000, 60000));
      url = await getRandomVid(playlist_id);
      await page.goto(url);
      await clickRandom(page, nb);
    }

    console.log(`BROWSER ${nb} - CLOSE`);
    await browser.close();

    fs.rmSync('./datadir/' + nb, { recursive: true, force: true });

    return;
  } catch (e) {
    console.error(`ERROR BROWSER ${nb} : ${e}`);

    await browser.close();
    fs.rmSync('./datadir/' + nb, { recursive: true, force: true });

    return;
  }
}

async function run(nb) {
  let promiseArray = [];

  try {
    process.setMaxListeners(0);
    let proxies = await getProxies();
    console.log('proxies => ', proxies);

    for (let i = 0; i < nb; i++) {
      promiseArray.push(watchPlaylist(i));
    }
    await Promise.all(promiseArray);

    return;
  } catch (e) {
    console.error(e);
    return;
  }
}

async function loop(simultaneous) {
  while (1) {
    console.log('test1');
    await run(simultaneous);
    console.log('test2');
    // limit call rate
    await sleep(rdn(20000, 50000));
  }
}

loop(simultaneous);