// auth.js
document.addEventListener('DOMContentLoaded', function () {
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        // User is signed in, do nothing or load the page
        console.log('User is signed in');
      } else {
        // No user is signed in, redirect to login page
        window.location.href = 'login.html';
      }
    });
  });
  