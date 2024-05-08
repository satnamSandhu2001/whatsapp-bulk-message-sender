// const readline = require('readline').createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

function clearCurrentLine() {
  process.stdout.write('\r'); // Move cursor to the beginning of the line
  process.stdout.write(' '.repeat(process.stdout.columns)); // Fill the line with spaces
  process.stdout.write('\r'); // Move cursor back to the beginning
}

function displayTimer(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  clearCurrentLine();
  process.stdout.write(
    `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  );
}

function startTimer(duration) {
  let remainingSeconds = duration;
  const timerId = setInterval(() => {
    remainingSeconds--;
    displayTimer(remainingSeconds);
    if (remainingSeconds === 0) {
      clearInterval(timerId);
      console.log(
        'Resuming on -- ',
        new Date().toLocaleString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        })
      );
      s;
    }
  }, 1000); // Update every second
}

// readline.question('Enter timer duration (seconds): ', (duration) => {
//   const seconds = parseInt(duration);
//   if (isNaN(seconds) || seconds <= 0) {
//     console.error(
//       'Invalid duration. Please enter a positive number of seconds.'
//     );
//     readline.close();
//   } else {
//     startTimer(seconds);
//   }
// });

module.exports = startTimer;
