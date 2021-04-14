$(function() {
  const FADE_TIME = 150; // ms
  const TYPING_TIMER_LENGTH = 400; // ms
  const COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];
  //Initatialization of the variables

  const socket = io();
  const $window = $(window);
  // const form = document.getElementById('form'); // Messages area
  const $usernameInput = $('#inputUsername'); // Input for username
  const $messages = $('#messages');           // Messages area
  const $inputMessage = $('.inputMessage');   // Input message input box
  const $loginPage = $('.login');        // The login page
  const $chatPage = $('.chat');          // The chatroom page

  //webcam vars
  const webcamElement = document.getElementById('webcam');
  const canvasElement = document.getElementById('canvas');
  const snapSoundElement = document.getElementById('snapSound');

  const $camera = $('#camera')

  const webcam = new Webcam(webcamElement, 'user', canvasElement, snapSoundElement);

  const $sendButton = $('#send'); //send button
  const $recorderButton = $('#recorder'); //recoder button
  // Prompt for setting a username
  let username;
  let connected = false;
  let typing = false;
  let lastTypingTime;
  let $currentInput = $usernameInput.focus();
  let chat = false;
  let picture = "";
  let emojiTabOpen = false

  const addParticipantsMessage = (data) => {
    let message = '';
    if (data.numUsers === 1) {
      message += `there's 1 participant`;
    } else {
      message += `there are ${data.numUsers} participants`;
    }
    log(message);
  }

  //emoji setting
  $('#emoji').on('click', () => {
    if ($('.emoji-picker').hasClass('hidden')) {
      emojiTabOpen = true
      $('.emoji-picker').removeClass('hidden')
    }
    else{
      $('.emoji-picker').addClass('hidden')
      emojiTabOpen = false
    }
  })

  document.querySelector('emoji-picker').addEventListener('emoji-click', (event) => {
    // console.log(event.detail)
    $inputMessage.val($inputMessage.val() + event.detail.unicode)
  });

  // Sets the client's username
  const setUsername = () => {
    username = $usernameInput.val().trim();

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  }

  // Sends a chat message
  const sendMessage = () => {
    let message = $inputMessage.val();
    // Prevent markup from being injected into the message
    // message = message;
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      $send_at = moment(new Date()).format('Y-MM-DD-HH-mm');
      addChatMessage({ username, message, date: $send_at });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', {message: message, date: $send_at });
    }
  }

  const sendImageMessage = () => {
    let message = $('#captionInput').val()
      if(chat && connected){
        
        $send_at = moment(new Date()).format('Y-MM-DD-HH-mm');
        addChatMessage({ username, message, date: $send_at, file: picture });

        // tell server to execute 'new message' and send along one parameter
        socket.emit('new message', {message: message, date: $send_at, file: picture });

        $('#closeCamera').click()
      }
  }

  // Log a message
  const log = (message, options) => {
    const $el = $('<span>').addClass('self-center font-thin bg-gray-300 rounded-xl text-xs text-gray-600 px-4').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  const addChatMessage = (data, options = {}) => {
    // Don't fade the message in if there is an 'X was typing'
    const $typingMessages = getTypingMessages(data);
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    if (data.typing) {

      const $usernameDiv = $(`<span class="w-6 py-1 text-xs text-white text-center font-thin rounded-xl ${username === data.username ? "order-2" : "order-1" }"/>`)
      .text((data.username[0]).toUpperCase())
      .css('background-color', getUsernameColor(data.username));

      const $messageBoxDivBody = $(`<span class="px-4 py-2 rounded-xl inline-block ${username === data.username ? "rounded-br-none bg-blue-600 text-white" : "rounded-bl-none bg-gray-300 text-gray-600"}"/>`)
      .html(`<div id="wave">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
      </div>`);

      const $messageBox = $(`<div class="flex items-end ${username === data.username ? "justify-end" : ""}">`)

      const $messageBoxDiv = $(`<div class="flex flex-col space-y-2 text-xs max-w-xs mx-2 ${username === data.username ? "order-1 items-end" : "order-2 items-start"}" />`)

      $messageBoxDiv.append($messageBoxDivBody)
      $messageBox.append($messageBoxDiv, $usernameDiv)
      
      const $messageDiv = $('<div class="chat-message"/>')
      .data('username', data.username)
      .addClass('typing')
      .append($messageBox)

    addMessageElement($messageDiv, options);
    } else {
      const $usernameDiv = $(`<span class="w-6 py-1 text-xs text-white text-center font-thin rounded-xl ${username === data.username ? "order-3" : "order-1" }"/>`)
      .text((data.username[0]).toUpperCase())
      .css('background-color', getUsernameColor(data.username));

      let hour =  data.date.split('-')[data.date.split('-').length - 2] + ":" + data.date.split('-')[data.date.split('-').length - 1]
      const $hour = $(`<em class="text-gray-500 text-xs ${username === data.username ? "order-1" : "order-3"}"/>`).text(hour)


      const $chatMessage = $(`<span class="px-4 py-2 rounded-xl inline-block ${username === data.username ? "rounded-br-none bg-blue-600 text-white" : "rounded-bl-none bg-gray-300 text-gray-600"}"/>`)
      
      if (data.file) {
        let $img = $(`<img src="${data.file}" alt="${data.username + "file"}" class="mb-2" />`)
        $chatMessage.append($img)
        
        if(data.message)
          $chatMessage.append($('<span />').text(data.message) )
      } else {
        $chatMessage.text(data.message);
      }

      const $messageBoxDivBody = $('<div />').append($chatMessage);

      const $messageBox = $(`<div class="${data.date} flex items-end ${username === data.username ? "justify-end" : ""}">`).data('username', data.username)

      $mbd = $(`.${data.date}`).filter(function (i) {
        return $(this).data('username') === data.username;
      })
    
        if($mbd.length > 0){
          const messages = $mbd.children().first().children()
            element = messages.last().children().first()
            if (element.hasClass('rounded-br-none')) {
              element.removeClass('rounded-br-none')
            } else if(element.hasClass('rounded-bl-none')){
              element.removeClass('rounded-bl-none')
            }

            $mbd.children().first().append($messageBoxDivBody)

        }else{
        const $messageBoxDiv = $(`<div class="flex flex-col space-y-2 text-xs max-w-xs mx-2 order-2 ${username === data.username ? "items-end" : "items-start"}" />`)
      
        $messageBoxDiv.append($messageBoxDivBody)
        $messageBox.append($messageBoxDiv, $usernameDiv, $hour)
        
        const $messageDiv = $('<div class="chat-message"/>').append($messageBox).data('username', data.username)

        if(data.username === username)
        {
          $otherUserMessageBox = $(`.${data.date}`).filter(function (i) {
            return $(this).data('username') != username;
          })

          $otherUserMessageBox.removeClass(`${data.date}`)
          $otherUserMessageBox.data('username', '')
        }
        else{
          $myMessageBox = $(`.${data.date}`).filter(function (i) {
            return $(this).data('username') === username;
          })

          $myMessageBox.removeClass(`${data.date}`)
          $myMessageBox.data('username', '')
        }
        
        addMessageElement($messageDiv, options);
      }
    }
  }

  const initCam = () =>{
    // if ($('#takeVideo').hasClass('hidden'))
    //   $('#takeVideo').removeClass('hidden')

    if($('#takeShot').hasClass('hidden'))
      $('#takeShot').removeClass('hidden')

    if(!$('#addCaption').hasClass('hidden'))
      $('#addCaption').addClass('hidden')

    if($('#webcam').hasClass('hidden'))
      $('#webcam').removeClass('hidden')

    if(!$('.showImage').hasClass('hidden'))
      $('.showImage').addClass('hidden')

    chat = true
    $currentInput = $('#captionInput').val('').focus();

  }

  $camera.on('click', () => {

    initCam()

    $('#camera-container').fadeIn(() => {
      $('#camera-container').toggleClass('hidden')
    })

    webcam.start().then(result =>{
      console.log("webcam started");
    }).catch(err => {
      console.log(err);
    });

  })

  $('#closeCamera').on('click', () => {
    $('#camera-container').fadeOut(() => {
      $('#camera-container').toggleClass('hidden')
    })

    chat = false
    $currentInput = $inputMessage.focus()

    webcam.stop()
  })

  $('#takeShot').on('click', () => {
    // $('#takeVideo').toggleClass('hidden')
    $('#takeShot').toggleClass('hidden')
    $('#addCaption').toggleClass('hidden')


    picture = webcam.snap()
    $('#webcam').addClass('hidden')
    $('.showImage').removeClass('hidden');
    $('.showImage').attr("src", picture);
    webcam.stop()
  })

  // Adds the visual chat typing message
  const addChatTyping = (data) => {
    data.typing = true;
    // data.message = 'is typing ...';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  const addMessageElement = (el, options) => {
    const $el = $(el);
    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }

    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Updates the typing event
  const updateTyping = () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(() => {
        const typingTimer = (new Date()).getTime();
        const timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  const getTypingMessages = (data) => {
    return $('.typing.chat-message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  const getUsernameColor = (username) => {
    // Compute hash code
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    const index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  $inputMessage.on('input', () => {
    updateTyping();
  });

  $sendButton.on('click', () => {
    sendMessage();
    socket.emit('stop typing');
    typing = false;
  })

  $('#sendImage').on('click', () => {
    sendImageMessage();
    picture = "";
  })

  $window.keydown(event => {
      // Auto-focus the current input when a key is typed
      if (!(event.ctrlKey || event.metaKey || event.altKey) && !emojiTabOpen) {
        $currentInput.focus();
      }
      // When the client hits ENTER on their keyboard
      if (event.which === 13) {
        if (username && chat) {
          sendImageMessage()
          picture = ""
        } else if (username  && !emojiTabOpen) {
          sendMessage();
          socket.emit('stop typing');
          typing = false;
        } else {
          setUsername();
        }
      }
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(() => {
    $currentInput.focus();
  });

  $inputMessage.on('click', () => {
    if(!$('.emoji-picker').hasClass('hidden'))
      $('#emoji').click()
  })

  // Whenever the server emits 'login', log the login message
  socket.on('login', (data) => {
    connected = true;
    // Display the welcome message
    const message = 'Welcome Meets Chat – ';
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', (data) => {
    addChatMessage(data);
  });

  socket.on('user joined', (data) => {
    log(`${data.username} joined`)
    addParticipantsMessage(data);
  })

  socket.on('user left', (data) => {
    log(`${data.username} left`)
    addParticipantsMessage(data);
    removeChatTyping(data)
  })

  socket.on('disconnect', () => {
    log('you have been disconnected');
  });

  socket.on('reconnect', () => {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', username);
    }
  });

  socket.on('reconnect_error', () => {
    log('attempt to reconnect has failed');
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', (data) => {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', (data) => {
    removeChatTyping(data);
  });
  
})