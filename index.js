/** Stealth YT Bot with proxy support **/

import { sleep, rdn, getParameterByName } from './utils.js';
import { executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import UserAgent from 'user-agents'

dotenv.config();

const playlist_id = process.env.PLAYLIST_ID
const simultaneous = process.env.SIMULTANEOUS;
const proxyApiKey = process.env.PROXYSCRAPE_API_KEY

async function createBrowser(nb, proxy) {
  try {
    puppeteer.use(StealthPlugin())

    const randomAgent = new UserAgent({ deviceCategory: 'desktop' });

    let args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--user-data-dir=datadir/' + nb,
      // '--window-size=' + randomAgent.viewportHeight + ',' + randomAgent.viewportWidth,
      '--window-size=1900,1000',
      '--disable-features=site-per-process',
      '--user-agent=' + randomAgent.userAgent,
    ]

    if (process.env.USE_PROXY == 1) {
      args.push('--proxy-server='+ proxy);
    }

    const browser = await puppeteer.launch({
      defaultViewport: null,
      headless: process.env.HEADLESS == 1 ? true : false,
      args: args,
      ignoreHTTPSErrors: true,
      executablePath: executablePath(),
    });
    console.log(`BROWSER ${nb} - START USING PROXY ${proxy ? proxy : 'NO PROXY'}`);

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
  let result = null;

  if (process.env.PROXYSCRAPE_API_KEY == 0) {
    result = await axios.get(`https://api.proxyscrape.com/v2`, {
      headers: {
        'Accept-Encoding': 'gzip,deflate,compress'
      },
      params: {
        'request': 'displayproxies',
        'country': 'all',
        'protocol': 'http',
        'timeout': 20000,
        'ssl': 'all',
        'anonymity': 'all'
      }
    })
  } else {
    result = await axios.get(`https://api.proxyscrape.com/v2/account/datacenter_shared/proxy-list`, {
      headers: {
        'Accept-Encoding': 'gzip,deflate,compress'
      },
      params: {
        'auth': proxyApiKey,
        'type': 'getproxies',
        'country[]': 'all',
        'protocol': 'http',
        'format': 'normal',
        'status': 'all',
      }
    });
  }

  return result.data.split("\r\n");
};

async function clickConsent(page, nb) {
  return new Promise((resolve, reject) => {
    const cookieConsentXpath = '//*[@id="yDmH0d"]/c-wiz/div/div/div/div[2]/div[1]/div[3]/div[1]/form[2]/div/div/button';

    page.waitForXPath(cookieConsentXpath, { timeout: 2000 }).then(async (elem) => {
      const cookieConsentCoordinate = await elem.boundingBox()
      await sleep(rdn(2000, 4000));
      await page.mouse.click(cookieConsentCoordinate.x + 10, cookieConsentCoordinate.y + 10, { button: 'left' });
      console.log(`BROWSER ${nb} - CLICK CONSENT`);
      resolve();
    }).catch((e) => {
      console.log(`BROWSER ${nb} - CONSENT COOKIE NOT FOUND`);
      resolve();
    });
  })
}

async function clickConsent2(page, nb) {
  return new Promise((resolve, reject) => {
    const cookieConsentXpath = '//*[@id="content"]/div[2]/div[6]/div[1]/ytd-button-renderer[2]/yt-button-shape/button/yt-touch-feedback-shape/div/div[2]';

    page.waitForXPath(cookieConsentXpath, { timeout: 2000 }).then(async (elem) => {
      const cookieConsentCoordinate = await elem.boundingBox()
      await sleep(rdn(2000, 4000));
      await page.mouse.click(cookieConsentCoordinate.x + 10, cookieConsentCoordinate.y + 10, { button: 'left' });
      console.log(`BROWSER ${nb} - CLICK CONSENT`);
      resolve();
    }).catch((e) => {
      console.log(`BROWSER ${nb} - CONSENT COOKIE NOT FOUND`);
      resolve();
    });
  })
}

/* mobile other version */
async function clickPlaylistMobile(page, nb) {
  return new Promise((resolve, reject) => {
    const randomXpath = '//*[@id="app"]/div[1]/ytm-browse/ytm-playlist-header-renderer/div[1]/a';

    page.waitForXPath(randomXpath, { timeout: 2000 }).then(async (elem) => {
      const randomCoordinate = await elem.boundingBox()
      await sleep(rdn(10000, 20000));
      console.log(`BROWSER ${nb} - CLICK RANDOM BUTTON`);
      await page.mouse.click(randomCoordinate.x + 10, randomCoordinate.y + 10, { button: 'left' });
      resolve();
    }).catch(() => {
      console.log(`BROWSER ${nb} - MOBILE PLAY BUTTON NOT FOUND`);
      resolve();
    });
  })
}

/* mobile */
async function clickRandomPlaylistMobile(page, nb) {
  return new Promise((resolve, reject) => {
    const randomXpath = '//*[@id="app"]/div[1]/ytm-browse/ytm-playlist-header-renderer-v2/div/div[2]/div[2]/div[3]/div[2]/ytm-button-renderer/a/yt-touch-feedback-shape/div'

    page.waitForXPath(randomXpath, { timeout: 2000 }).then(async (elem) => {
      const randomCoordinate = await elem.boundingBox()
      await sleep(rdn(10000, 20000));
      console.log(`BROWSER ${nb} - CLICK RANDOM BUTTON`);
      await page.mouse.click(randomCoordinate.x + 10, randomCoordinate.y + 10, { button: 'left' });
      resolve();
    }).catch(async () => {
      await clickPlaylistMobile(page, nb)
      console.log(`BROWSER ${nb} - MOBILE RANDOM PLAYLIST BUTTON NOT FOUND`);
      resolve();
    });
  })
}

/* tablet */
async function clickRandomPlaylistTablet(page, nb) {
  return new Promise((resolve, reject) => {
    const randomXpath = '//*[@id="top-level-buttons-computed"]/ytd-button-renderer[1]/a';

    page.waitForXPath(randomXpath, { timeout: 2000 }).then(async (elem) => {
      const randomCoordinate = await elem.boundingBox()
      await sleep(rdn(10000, 20000));
      console.log(`BROWSER ${nb} - CLICK RANDOM BUTTON`);
      await page.mouse.click(randomCoordinate.x + 20, randomCoordinate.y + 20, { button: 'left' });
      resolve();
    }).catch(async () => {
      console.log(`BROWSER ${nb} - TABLET RANDOM PLAYLIST BUTTON NOT FOUND`);
      await clickRandomPlaylistMobile(page, nb);
      resolve();
    });
  })
}

/* desktop */
async function clickRandomPlaylistDektop(page, nb) {
  return new Promise((resolve, reject) => {
    const randomXpath = '//*[@id="page-manager"]/ytd-browse/ytd-playlist-header-renderer/div/div[2]/div[1]/div/div[2]/ytd-button-renderer[2]/yt-button-shape/a/yt-touch-feedback-shape/div/div[2]';

    page.waitForXPath(randomXpath, { timeout: 2000 }).then(async (elem) => {
      const randomCoordinate = await elem.boundingBox()
      await sleep(rdn(10000, 20000));
      console.log(`BROWSER ${nb} - CLICK RANDOM BUTTON`);
      await page.mouse.click(randomCoordinate.x + 10, randomCoordinate.y + 10, { button: 'left' });
      resolve();
    }).catch(async () => {
      console.log(`BROWSER ${nb} - DESKTOP RANDOM PLAYLIST BUTTON NOT FOUND`);
      await clickRandomPlaylistTablet(page, nb);
      resolve();
    });
  })
}

async function clickRandomVideo(page, nb) {
  return new Promise((resolve, reject) => {
    const randomXpath = '//*[@id="top-level-buttons-computed"]/ytd-toggle-button-renderer';

    page.waitForXPath(randomXpath, { timeout: 30000 }).then(async (elem) => {
      const randomCoordinate = await elem.boundingBox()
      await sleep(rdn(10000, 20000));
      console.log(`BROWSER ${nb} - CLICK RANDOM BUTTON`);
      await page.mouse.click(randomCoordinate.x + 10, randomCoordinate.y + 10, { button: 'left' });
      resolve();
    }).catch((e) => {
      console.log(`BROWSER ${nb} - RANDOM VIDEO BUTTON NOT FOUND`);
      resolve();
    });
  })
}

async function clickOnVideo(page, label, nb) {
  return new Promise((resolve, reject) => {
    const randomXpath = '//*[@id="movie_player"]/div[1]/video';

    page.waitForXPath(randomXpath, { timeout: 30000 }).then(async (elem) => {
      const randomCoordinate = await elem.boundingBox()
      console.log(`BROWSER ${nb} - CLICK ${label} BUTTON`);
      await page.mouse.click(randomCoordinate.x + 30, randomCoordinate.y + 30, { button: 'left' });
      resolve();
    }).catch((e) => {
      console.log(`BROWSER ${nb} - ${label} BUTTON NOT FOUND`);
      resolve();
    });
  })
}

async function getVideoName(page, nb) {
  try {
    const labelXpath = '//*[@id="title"]/h1/yt-formatted-string';
    const labelElem = await page.waitForXPath(labelXpath, { timeout: 5000 });
    const label = await labelElem.evaluate(el => el.textContent);

    return label;
  } catch(e) {
    console.log(`BROWSER ${nb} - BUTTON VIDEO NAME NOT FOUND`);
  }
}

async function pausePlay(page, nb) {
  await clickOnVideo(page, 'PAUSE', nb);
  await sleep(rdn(500, 1200));
  await clickOnVideo(page, 'PLAY', nb);
}

async function reloadPlaylist(page, nb) {
  const nbRload = 4;
  const url = `https://www.youtube.com/playlist?list=${playlist_id}`;

  for (let i = 0; i < nbRload; i++) {
    console.log(`BROWSER ${nb} - RELOAD`);
    await sleep(rdn(60000*2, 60000 * 6));
    await page.goto(url);
    await sleep(rdn(1000, 2200));
    await clickRandomPlaylistDektop(page, nb);
    await sleep(rdn(1000, 2200));
    await sleep(rdn(1000, 2200));
    await pausePlay(page, nb);
  }
}

async function watchPlaylist(nb, proxy) {
  await sleep(rdn(500, 20000));
  const url = `https://www.youtube.com/playlist?list=${playlist_id}`;
  let browser = await createBrowser(nb, proxy);
  try {
    let page = await createPage(browser);

    page.on("framenavigated", async (frame) => {
      const v = getParameterByName('v', frame.url())
      if (v) {
        let videoName = await getVideoName(page, nb);
        console.log(`BROWSER ${nb} - WATCHING ${videoName ? videoName : 'AD'}`);
        await sleep(rdn(500, 1200));
        await clickRandomVideo(page, nb);
        await pausePlay(page, nb);
      }
    });

    await page.goto(url);

    await clickConsent2(page, nb);
    await clickRandomPlaylistDektop(page, nb);
    await reloadPlaylist(page, nb);

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

async function clickSearch(page, text, nb) {
  return new Promise(async (resolve, reject) => {
    const buttonXpath = '//*[@id="search-icon-legacy"]';
    const searchXpath = '//*[@id="search-input"]';

    page.waitForXPath(searchXpath, { timeout: 30000 }).then(async (elem) => {
      console.log(elem);
      await sleep(rdn(2000, 5000));
      await elem.click();
      await elem.type(text, {delay: 150});
      page.waitForXPath(buttonXpath, { timeout: 30000 }).then(async (elem) => {
        const randomCoordinate = await elem.boundingBox()
        console.log(`BROWSER ${nb} - SEARCH ${text}`);
        await page.mouse.click(randomCoordinate.x + 30, randomCoordinate.y + 30, { button: 'left' });
        resolve();
      }).catch((e) => {
        console.log(`BUTTON ${nb} - ERROR ${e}`);
        resolve();
      });
    }).catch((e) => {
      console.log(`SEARCH ${nb} - ERROR ${e}`);
    })
  })
}

async function clickOnVideoThumb(page, nb) {
  return new Promise((resolve, reject) => {
    const thumbXpath = '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-search/div[1]/ytd-two-column-search-results-renderer/div[2]/div/ytd-section-list-renderer/div[2]/ytd-item-section-renderer/div[3]/ytd-video-renderer[1]/div[1]/ytd-thumbnail';

    page.waitForXPath(thumbXpath, { timeout: 30000 }).then(async (elem) => {
      const randomCoordinate = await elem.boundingBox()
      console.log(`BROWSER ${nb} - CLICK THUMB`);
      await page.mouse.click(randomCoordinate.x + 50, randomCoordinate.y + 50, { button: 'left' });
      resolve();
    }).catch((e) => {
      console.log(`BROWSER ${nb} - THUMB NOT FOUND ${e}`);
      resolve();
    });
  })
}

async function watchVideo(nb, proxy) {
  await sleep(rdn(500, 20000));
  const url = `https://www.youtube.com/`;
  let browser = await createBrowser(nb, proxy);
  try {
    let page = await createPage(browser);
    let content = fs.readFileSync('codes.txt',{encoding:'utf8', flag:'r'});
    let tab = content.split('\n');
    
    await page.goto(url);
    await sleep(rdn(1000, 2200));
    await clickConsent2(page, nb);
    await sleep(rdn(1000, 2200));
    await clickSearch(page, tab[rdn(0, tab.length)], nb);
    await sleep(rdn(1000, 2200));
    await clickOnVideoThumb(page, nb);
    await sleep(rdn(100000, 190000));

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
    if (process.env.USE_PROXY == 1) {
      let proxies = await getProxies();
      for (let i = 0; i < nb; i++) {
        if (process.env.MODE == 'SEARCH') {
          promiseArray.push(watchVideo(i, proxies[rdn(0, proxies.length - 1)]));
        } else {
          promiseArray.push(watchPlaylist(i, proxies[rdn(0, proxies.length - 1)]));
        }
      }
    } else {
      for (let i = 0; i < nb; i++) {
        if (process.env.MODE == 'SEARCH') {
          promiseArray.push(watchVideo(i));
        } else {
          promiseArray.push(watchPlaylist(i));
        }
      }
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