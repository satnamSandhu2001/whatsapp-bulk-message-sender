const { Client, NoAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const csv = require('csv-parser');

const contacts = [];

const contactsFile = 'contacts.csv';
const msgFile = 'message.txt';
const mediaImgPath = './img1.jpeg';

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

/*
const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

const client = new Client({
    session: sessionCfg
});
*/

// equivalent to
const client = new Client({
  authStrategy: new NoAuth(),
});

client.initialize();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

/*
client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});
*/

client.on('auth_failure', (msg) => {
  // Fired if session restore was unsuccessfull
  console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
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

  // const message = await fs.readFileSync(msgFile, { encoding: 'utf-8' });
  var media_img = await MessageMedia.fromFilePath(mediaImgPath);

  for (let contact of contacts) {
    if (counter.total !== 0 && counter.total % 50 === 0) {
      console.log('Paused for 10 minutes...');
      await sleep(10 * 60 * 1000);
    }
    counter.total++;
    contact = contact.replace(/[- ]+/g, '').trim();
    let final_number =
      contact.length > 10 ? `${contact}@c.us` : `91${contact}@c.us`;

    const isRegistered = await client.isRegisteredUser(final_number);
    if (isRegistered) {
      try {
        await client.sendMessage(final_number, media_img);
        console.log(`Sr No. : ${counter.total} ${contact} Sent`);
        counter.success++;
      } catch (error) {
        console.log(error);
        writeReport(contact);
        counter.fails++;
        console.log(`Sr No. : ${counter.total} ${contact} Failed`);
      }
      /*
            deleteChat(final_number)
            .then((res) => console.log(res)) // contains ["successfuly deleted"]
            .catch((err) => console.log(err))// contains ["something went wrong", "do not have chat history"]
            */
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
  destroyClient();
  //   process.exit(0);
}

// async function deleteChat(phoneNumber) {
//     return new Promise((resolve, reject) => {
//         client.getChatById(phoneNumber).then((chat) => {
//             // console.log("Chat information = ", chat)
//             chat.delete().then((deleteRes) => {
//                 if(deleteRes)
//                     resolve(`successfuly deleted`)
//                 else
//                     reject("something went wrong")
//             })
//         }).catch((err) => {
//             if(err.message.includes("Cannot read property 'serialize' of undefined"))
//                 reject(`do not have chat history`)
//             // can handle other error messages...
//         })
//     })
// }
