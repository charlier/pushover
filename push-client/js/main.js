'use strict';

let reg;
let sub;
let isSubscribed = false;
const subscribeButton = document.querySelector('button');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
  .then(function(serviceWorkerRegistration) {
    reg = serviceWorkerRegistration;
    reg.pushManager.getSubscription()
    .then(function(subbed) {
      subscribeButton.disabled = false;
      if (subbed) {
        sub = subbed;
        updateButton(true);
        updateProgrammeList();
        createNav();
        getStuffFromIBL('a');
      } else {
        updateButton(false);
      }
    });
  });
} else {
  subscribeButton.disabled = true;
}

Array.from(document.querySelectorAll('h2')).forEach(link => {
  link.addEventListener('click', function() {
    if (this.getAttribute('type') === 'notify') {
      document.getElementById('myProgs').classList.toggle('hidden');
    } else {
      document.getElementById('ibl').classList.toggle('hidden');
    }
  });
});

subscribeButton.addEventListener('click', function() {
  if (isSubscribed) {
    unsubscribe();
  } else {
    subscribe();
  }
});

function updateProgrammeList() {
  getMyProgs().then(function(data) {
    const programmeList = document.createDocumentFragment();
    if (data.programmes) {
      Array.from(data.programmes).forEach(programme => {
        programmeList.appendChild(createProgrammeView(programme, 'remove'));
      });
    }
    const progsList = document.getElementById('myProgs');
    while (progsList.firstChild) {
      progsList.removeChild(progsList.firstChild);
    }
    progsList.appendChild(programmeList);
  });
}

function createNav() {
  const nav = Array.apply(null, {length: 26})
  .map(function(x,i) {
    return String.fromCharCode(97 + i);
  }),
  navList = document.createDocumentFragment();
  nav.push('0-9');
  Array.from(nav).forEach(navItem => {
    const item = document.createElement('button');
    item.innerHTML = navItem;
    item.addEventListener('click', function(e) {
      e.preventDefault();
      getStuffFromIBL(navItem);
    });
    navList.appendChild(item);
  });
  const navDiv = document.getElementById('nav');
  while (navDiv.firstChild) {
    navDiv.removeChild(navDiv.firstChild);
  }
  navDiv.appendChild(navList);
}

function createProgrammeView(programme, type) {
  const newProgramme = document.createElement('div');
  newProgramme.className = 'container';
  newProgramme.innerHTML =
  '<div class="left">' +
  '<div class="img-container"> ' +
  '<img src=' +
  programme.images.standard.replace('{recipe}', '976x549').replace('http://', 'https://') +
  ' class="image"' +
  'onload="this.style.opacity=1;" style="opacity:0;" />' +
  '<span class="fade"></span>' +
  '</div>' +
  '<div class="padding">' +
  '<h2>' + programme.title + '</h2>' +
  '<p>' + programme.synopses.medium + '</p>' +
  '</div>' +
  '</div>';
  newProgramme.addEventListener('click', function() {
    const myProgsDiv = document.getElementById('myProgs');
    if (type === 'remove') {
      type = 'add';
      removeProg(programme.id);
      myProgsDiv.removeChild(this);
    } else {
      type = 'remove';
      addProg(programme.id);
      const clone = this.cloneNode(true);
      myProgsDiv.appendChild(clone);
    }
    this.setAttribute(
      'style',
      '-webkit-filter: blur(10px);'
    );
  });
  return newProgramme;
}

function updateButton(subState) {
  if (subState) {
    subscribeButton.textContent = 'Unsubscribe';
    isSubscribed = true;
  } else {
    subscribeButton.textContent = 'Subscribe';
    isSubscribed = false;
  }
}

function subscribe() {
  reg.pushManager.subscribe({userVisibleOnly: true})
  .then(function(pushSubscription) {
    sub = pushSubscription;
    addUser().then(function() {
      createNav();
      getStuffFromIBL('a');
    });
    updateButton(true);
  });
}

function unsubscribe() {
  tidy().then(function() {
    sub.unsubscribe().then(function() {
      updateButton(false);
    });
  });
}

function getMyProgs() {
  return simplePost('pid')
  .then(r => r.json()).then(function(data) {
    return data;
  });
}

function simplePost(param, pid) {
  const url = '/api/' + param,
  newObject = JSON.parse(JSON.stringify(sub));
  if (pid) {
    newObject.pid = pid;
  }
  return fetch(url, {
    method: 'post',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify(newObject)
  });
}

function addProg(pid) {
  simplePost('newpid', pid);
}

function removeProg(pid) {
  simplePost('removepid', pid);
}

function addUser() {
  return simplePost('user');
}

function tidy() {
  return simplePost('tidy');
}

function getStuffFromIBL(letter) {
  const url = 'https://ibl.api.bbci.co.uk/v1/atoz/{replace}/programmes'
  .replace('{replace}', letter) + '?per_page=100';
  fetch(url)
  .then(r => r.json())
  .then(function(data) {
    const programmeList = document.createDocumentFragment();
    if (data.atoz_programmes.elements) {
      Array.from(data.atoz_programmes.elements).forEach(programme => {
        programmeList.appendChild(createProgrammeView(programme, 'add'));
      });
    }
    const iBLDiv = document.getElementById('ibl');
    while (iBLDiv.firstChild) {
      iBLDiv.removeChild(iBLDiv.firstChild);
    }
    iBLDiv.appendChild(programmeList);
  });
}
