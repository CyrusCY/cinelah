const { getCountry, getGenre, getRating, formatTitle } = require('./formatter.js');

module.exports = {
  getShowtimes
};

function getCathayMovies(json) {
  const hash = json.reduce(function(a, { dates }) {

    dates.reduce(function(b, { date, movies }) {

      movies.reduce(function(c, { name, title, timings }) {
        a[title] = a[title] || {};
        a[title].dates = a[title].dates || {};
        a[title].dates[date] = a[title].dates[date] || [];
        a[title].dates[date] = a[title].dates[date].concat({
          name,
          timings
        });
        return c;
      }, {});

      return b;
    }, {});

    return a;
  }, {});

  const hashy = Object.keys(hash).map(function(title) {
    return {
      title,
      dates: Object.keys(hash[title].dates).map(function(date) {
        return {
          date,
          cinemas: hash[title].dates[date]
        };
      })
    };
  });

  return hashy;
}

function getFilmgardeMovies(json) {
  const hash = json.reduce(function(a, { date, cinemas }) {

    cinemas.reduce(function(b, { name, movies }) {

      movies.reduce(function(c, { title, timings }) {
        a[title] = a[title] || {};
        a[title].dates = a[title].dates || {};
        a[title].dates[date] = a[title].dates[date] || [];
        a[title].dates[date] = a[title].dates[date].concat({
          name,
          timings
        });
        return c;
      }, {});

      return b;
    }, {});

    return a;
  }, {});

  const hashy = Object.keys(hash).map(function(title) {
    return {
      title,
      dates: Object.keys(hash[title].dates).map(function(date) {
        return {
          date,
          cinemas: hash[title].dates[date]
        };
      })
    };
  });

  return hashy;
}

function getGvMovies(json) {
  const hash = json.reduce(function(a, { name, movies }) {

    movies.reduce(function(b, { title, dates }) {

      dates.reduce(function(c, { date, timings }) {
        a[title] = a[title] || {};
        a[title].dates = a[title].dates || {};
        a[title].dates[date] = a[title].dates[date] || [];
        a[title].dates[date] = a[title].dates[date].concat({
          name,
          timings
        });
        return c;
      }, {});

      return b;
    }, {});

    return a;
  }, {});

  const hashy = Object.keys(hash).map(function(title) {
    return {
      title,
      dates: Object.keys(hash[title].dates).map(function(date) {
        return {
          date,
          cinemas: hash[title].dates[date]
        };
      })
    };
  });

  return hashy;
}

function getShawMovies(json) {
  const hash = json.reduce(function(a, { date, cinemas }) {

    cinemas.reduce(function(b, { name, movies }) {

      movies.reduce(function(c, { title, timings }) {
        a[title] = a[title] || {};
        a[title].dates = a[title].dates || {};
        a[title].dates[date] = a[title].dates[date] || [];
        a[title].dates[date] = a[title].dates[date].concat({
          name,
          timings
        });
        return c;
      }, {});

      return b;
    }, {});

    return a;
  }, {});

  const hashy = Object.keys(hash).map(function(title) {
    return {
      title,
      dates: Object.keys(hash[title].dates).map(function(date) {
        return {
          date,
          cinemas: hash[title].dates[date]
        };
      })
    };
  });

  return hashy;
}

function getWeMovies(json) {
  const hash = json.reduce(function(a, { name, dates }) {

    dates.reduce(function(b, { date, movies }) {
      movies.reduce(function(c, { title, timings }) {
        a[title] = a[title] || {};
        a[title].dates = a[title].dates || {};
        a[title].dates[date] = a[title].dates[date] || [];
        a[title].dates[date] = a[title].dates[date].concat({
          name,
          timings
        });
        return c;
      }, {});

      return b;
    }, {});

    return a;
  }, {});

  const hashy = Object.keys(hash).map(function(title) {
    return {
      title,
      dates: Object.keys(hash[title].dates).map(function(date) {
        return {
          date,
          cinemas: hash[title].dates[date]
        };
      })
    };
  });

  return hashy;
}

function getMovies({ cathay, filmgarde, gv, shaw, we }) {
  return [
    ...getCathayMovies(cathay),
    ...getFilmgardeMovies(filmgarde),
    ...getGvMovies(gv),
    ...getShawMovies(shaw),
    ...getWeMovies(we)
  ];
}

function getShowtimes({ cathay, filmgarde, gv, shaw, we }) {
  console.info('getShowtimes started');
  return Promise.all(getMovies({ cathay, filmgarde, gv, shaw, we }).map(function(movie) {
    return formatTitle(movie.title)
      .then(function(title) {
        movie.title = title;
        return Promise.all([getGenre(title), getRating(title), getCountry(title)]);
      })
      .then(function([genre, rating, country]) {
        movie.country = country;
        movie.rating = rating;
        movie.genre = genre;
        return movie;
      })
      .catch(function(err) {
        return Promise.reject(err);
      });
  }))
  .then(function(movies) {
    const showtimes = movies.reduce(function(a, { title, genre, rating, country, dates }) {

      dates.reduce(function(b, { date, cinemas }) {

        cinemas.reduce(function(c, { name, timings }) {
          a = [...a, ...timings.map(function({ time, url }) {
            return {
              cinema: name,
              country,
              date,
              genre,
              movie: title,
              rating,
              time: time,
              url
            };
          })];
          return c;
        }, []);

        return b;
      }, []);

      return a;
    }, [])
      .sort(function(a, b) {
        return a.movie < b.movie ? -1 :
          a.movie > b.movie ? 1 :
          0;
      });

    console.info('getShowtimes finished');
    return showtimes;
  });
}

