  function navmain() {
  // Check the system's default theme
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Get the current theme from cookies or default to system preference
  const currentTheme = document.cookie.replace(/(?:(?:^|.*;\s*)theme\s*\=\s*([^;]*).*$)|^.*$/, "$1") || (prefersDarkMode ? 'dark' : 'light');

  // Apply the current theme
  document.documentElement.setAttribute('data-theme', currentTheme);

	  
	  if (typeof(customreload) === "function"){
		  customreload();

	  }

}

  // Toggle function
  function toggleTheme() {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    // Store the user's preference in a cookie
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000`; // 1 year expiry
 
	  if (typeof(customreload) === "function"){
		  customreload();

	  }

  }
addEventListener("DOMContentLoaded", (event) => {
navmain();
});
