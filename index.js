

import { sleep, rdn, getParameterByName } from './utils.js';
import { executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const playlist_id = process.env.PLAYLIST_ID
const simultaneous = process.env.SIMULTANEOUS;
const proxyApiKey = process.env.PROXYSCRAPE_API_KEY

async function createBrowser(nb, proxy) {
  try {
    puppeteer.use(StealthPlugin())

    const browser = await puppeteer.launch({
      defaultViewport: null,
      headless: true,
      args: [
        '--proxy-server='+proxy,
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
    console.log(`BROWSER ${nb} - START USING PROXY ${proxy}`);

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
  return result.data.split("\r\n");
};

async function clickConsent(page, nb) {
  return new Promise((resolve, reject) => {
    const cookieConsentXpath = '//*[@id="yDmH0d"]/c-wiz/div/div/div/div[2]/div[1]/div[3]/div[1]/form[2]/div/div/button';

    page.waitForXPath(cookieConsentXpath, {timeout: 10000}).then(async (elem) => {
      const cookieConsentCoordinate = await elem.boundingBox()
      await sleep(rdn(2000, 4000));
      await page.mouse.click(cookieConsentCoordinate.x + 10, cookieConsentCoordinate.y + 10, { button: 'left' });
      console.log(`BROWSER ${nb} - CLICK CONSENT`);
      resolve();
    }).catch((e)=>{
      console.log(`BROWSER ${nb} - CONSENT COOKIE NOT FOUND`);
      resolve();
    });
  })
}

async function clickRandomPlaylist(page, nb) {
  return new Promise((resolve, reject) => {
    const randomXpath = '//*[@id="page-manager"]/ytd-browse/ytd-playlist-header-renderer/div/div[2]/div[1]/div/div[2]/ytd-button-renderer[2]/yt-button-shape/a/yt-touch-feedback-shape/div/div[2]';

    page.waitForXPath(randomXpath, {timeout: 10000}).then(async (elem) => {
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

async function clickRandomVideo(page, nb) {
  return new Promise((resolve, reject) => {
    const randomXpath = '//*[@id="top-level-buttons-computed"]/ytd-toggle-button-renderer';

    page.waitForXPath(randomXpath, {timeout: 10000}).then(async (elem) => {
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

async function watchPlaylist(nb, proxy) {
  await sleep(rdn(500, 20000));
  const nbRload = 12;
  let url = `https://www.youtube.com/playlist?list=${playlist_id}`;
  let browser = await createBrowser(nb, proxy);
  try {
    let page = await createPage(browser);

    page.on("framenavigated", frame => {
      const v = getParameterByName('v', frame.url())
      if (v) {
        console.log(`BROWSER ${nb} - WATCHING ${v}`);
      }
    });

    await page.goto(url);

    await clickConsent(page, nb);
    await clickRandomPlaylist(page, nb);
    await clickRandomVideo(page, nb);

    for (let i = 0; i < nbRload; i++) {
      console.log(`BROWSER ${nb} - RELOAD`);
      await sleep(rdn(60000, 60000*5));
      await page.goto(url);
      await clickRandomVideo(page, nb);
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

    for (let i = 0; i < nb; i++) {
      promiseArray.push(watchPlaylist(i, proxies[rdn(0, proxies.length-1)]));
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
    await run(simultaneous);
    // limit call rate
    await sleep(rdn(10000, 30000));
  }
}

loop(simultaneous);