const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const csv = require('csv-parser');
const startTimer = require('./timer');

const contacts = [];

const contactsFile = 'contacts.csv';
const msgFile = 'message.txt';
// const mediaImgPath = './img1.jpeg';

fs.createReadStream(contactsFile)
  .pipe(csv())
  .on('data', function (data) {
    try {
      contacts.push(data.number);
    } catch (err) {
      console.error(err);
    }
  })
  .on('end', () => {
    console.log('Total contacts ', contacts.length, ' : ', contacts);
  });

let counter = { fails: 0, success: 0, total: 0 };

// equivalent to
const client = new Client({
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
  authStrategy: new LocalAuth({ dataPath: './sessions' }),
  webVersionCache: {
    type: 'remote',
    remotePath:
      'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  },
});

client.initialize();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('auth_failure', (msg) => {
  // Fired if session restore was unsuccessfull
  console.error('AUTHENTICATION FAILURE', msg);
});

// on inputing Ctrl+C exit process and destroy client
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await destroyClient();
  process.exit(0);
});

client.on('ready', (se) => {
  console.log('Client is ready!');
  deploy_all();
});

client.on('disconnected', (reason) => {
  console.log('Client was logged out', reason);
});

const destroyClient = async () => {
  return new Promise((resolve) => {
    client.removeAllListeners();
    setTimeout(() => {
      try {
        client.destroy();
      } catch (e) {
        logger.error(e);
      }
      return resolve();
    }, 2500);
  });
};

// create report file for results
function createFile(reportfileName) {
  fs.writeFileSync(reportfileName, 'Failed contacts : ', (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('New report file created - ', reportfileName);
  });
}
let d = new Date();
let dt = {
  d: d.toDateString(),
  t: d.getHours() + 'H ' + d.getMinutes() + 'M r',
};
let ReportFile = `Report - ${dt.d + ' ' + dt.t}.txt`;

// write to report file
function writeReport(newLine) {
  try {
    let _reportFileContent = fs.readFileSync(`${ReportFile}`, 'utf8');
    let _updatedContent = _reportFileContent + '\n' + newLine;
    fs.writeFileSync(`${ReportFile}`, _updatedContent, 'utf8');
  } catch (error) {
    console.log('Report File Error!...' + '\n' + err);
  }
}

// custom function for timeout
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function random_ms(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function deploy_all() {
  createFile(ReportFile);

  const message = fs.readFileSync(msgFile, { encoding: 'utf-8' });
  // var media_img = MessageMedia.fromFilePath(mediaImgPath);

  for (let contact of contacts) {
    if (counter.total !== 0 && counter.total % 50 === 0) {
      console.log('Paused for 10 minutes...');
      startTimer(10 * 60);
      await sleep(10 * 60 * 1000);
    }
    counter.total++;
    contact = contact.replace(/[- ]+/g, '').trim();
    let final_number =
      contact.length > 10 ? `${contact}@c.us` : `91${contact}@c.us`;

    const isRegistered = await client.isRegisteredUser(final_number);
    if (isRegistered) {
      try {
        await client.sendMessage(final_number, message, { linkPreview: true });
        // await client.sendMessage(final_number, media_img, { caption: message });
        console.log(`Sr No. : ${counter.total} ${contact} Sent`);
        counter.success++;
      } catch (error) {
        console.log(error);
        writeReport(contact);
        counter.fails++;
        console.log(`Sr No. : ${counter.total} ${contact} Failed`);
      }
    } else {
      writeReport(`  ${contact}`);
      counter.fails++;
      console.log(`Sr No. : ${counter.total} ${contact} Failed`);
    }
    await sleep(random_ms(15, 25) * 1000);
  }
  console.log(
    `Result: ${counter.success + counter.fails} Total, ${
      counter.success
    } sent, ${counter.fails} failed \n`
  );
  writeReport(
    `\n\nResults :~ \n  Total: ${counter.success + counter.fails},\n  Sent: ${
      counter.success
    },\n  Failed: ${counter.fails}`
  );
  await destroyClient();
  process.exit(0);
}
