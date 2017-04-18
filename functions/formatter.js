const axios = require('axios');
const cheerio = require('cheerio');
const memoize = require('lodash.memoize');
const Case = require('case');

const TMDB_API_KEY = 'bd09ff783d37c8e5a07b105ab39a7503';

module.exports = {
  dateFormat: 'YYYY-MM-DD',
  formatCinema,
  formatTitle: memoize(formatTitle),
  timeFormat: 'HH:mm'
};

function formatCinema(originalStr) {
  return {
    'AMK HUB': 'Cathay - AMK Hub',
    'Bugis+': 'Filmgarde - Bugis+',
    'CAUSEWAY POINT': 'Cathay - Causeway Point',
    'CINELEISURE ORCHARD': 'Cathay - Cineleisure Orchard',
    'DOWNTOWN EAST': 'Cathay - Downtown East',
    'GV Bishan': 'GV - Bishan',
    'GV City Square': 'GV - City Square',
    'GV Grand, Great World City': 'GV - Gemini Grand, Great World City',
    'GV Jurong Point': 'GV - Jurong Point',
    'GV Katong': 'GV - Katong',
    'GV Plaza': 'GV - Plaza',
    'GV Suntec City': 'GV - Suntec City',
    'GV Tampines': 'GV - Tampines',
    'GV Tiong Bahru': 'GV - Tiong Bahru',
    'GV VivoCity': 'GV - VivoCity',
    'GV Yishun': 'GV - Yishun',
    'JEM': 'Cathay - Jem',
    'Leisure Park Kallang': 'Filmgarde - Leisure Park Kallang',
    'Shaw Theatres Balestier': 'Shaw - Theatres Balestier',
    'Shaw Theatres Century': 'Shaw - Theatres Century',
    'Shaw Theatres JCube': 'Shaw - Theatres JCube',
    'Shaw Theatres Lido': 'Shaw - Theatres Lido',
    'Shaw Theatres Lot One': 'Shaw - Theatres Lot One',
    'Shaw Theatres Seletar': 'Shaw - Theatres Seletar',
    'Shaw Theatres Waterway Point': 'Shaw - Theatres Waterway Point',
    'Shaw Theatres nex': 'Shaw - Theatres nex',
    'THE CATHAY': 'Cathay - The Cathay',
    'WE Cinemas, Clementi': 'WE - Cinemas',
    'WEST MALL': 'Cathay - West Mall'
  }[originalStr] || originalStr;
}

function formatTitle(originalStr) {
  let cleanStr = originalStr
    .replace(/Dining\sSet\*/g, '')
    .replace(/Fans\`\sSc\*/g, '')
    .replace(/Kids\sFlix \–/g, '')
    .replace(/the\smovie/gi, '')
    .replace(/\`/g, '\'')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\s*\:/g, ':')
    .replace(/\s+3D/g, '')
    .replace(/PG(\d*)/g, '')
    .replace(/NC(\d+)/g, '')
    .replace(/M(\d+)/g, '')
    .replace(/\*Atmos/g, '')
    .replace(/Marathon/g, '')
    .replace(/TBA/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\*/g, '')
    .trim();
  cleanStr = Case.title(cleanStr);

  if (originalStr.includes('Mums & Babies – Trolls')) {
    cleanStr = 'Trolls';
  }

  return searchTitleOnTmbd(cleanStr)
    .then(function(response) {
      if (!response.data.total_results) {
        cleanStr = cleanStr
          .replace(/\s*\w*\.\w*\s+/gi, ' ')
          .replace(/\s*\w*\'\w*\s+/gi, ' ')
          .trim();
        return searchTitleOnTmbd(cleanStr);
      }

      return response;
    })
    .then(function(response) {
      if (response.data.total_results) {
        return response.data.results[0].title;
      }
      return Promise.reject(new Error('No results on TMDB'));
    })
    .catch(function(err) {
      if (err.message === 'No results on TMDB') {
        return searchTitleOnImdbViaDDG(cleanStr);
      }
    })
    .then(function(clean) {
      console.info(`formatTitle ${originalStr} to ${clean}`);
      return clean;
    });
}

function searchTitleOnTmbd(str) {
  return axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${str}`)
    .catch(function(err) {
      if (err.response && err.response.status === 429) {
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve(searchTitleOnTmbd(str));
          }, 10000);
        });
      } else {
        console.error(err);
        return Promise.reject(err);
      }
    });
}

function searchTitleOnImdbViaDDG(str) {
  return axios.get(`https://duckduckgo.com/?q=!ducky+${str} 2017+site%3Aimdb.com`)
    .then(function(response) {
      var [id] = response.data.match(/tt\d+/);
      return axios.get(`http://www.imdb.com/title/${id}/`);
    })
    .then(function(response) {
      const $ = cheerio.load(response.data);
      return $('h1[itemprop="name"]')
         .children()
         .remove()
         .end()
         .text()
         .trim();
    });
}
