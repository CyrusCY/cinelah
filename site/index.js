import { h, render, Component } from 'preact';
import Router from 'preact-router';
import Match from 'preact-router/match';
import addDays from 'date-fns/add_days';
import isAfter from 'date-fns/is_after';
import isToday from 'date-fns/is_today';
import isTomorrow from 'date-fns/is_tomorrow';
import format from 'date-fns/format';

import './style.scss';
import './favicon.png';
import './icon512.png';
import './open-graph.png';

const BUCKET = 'https://storage.googleapis.com/cinelah-92dbb.appspot.com';

const scrollTop = {};
const pushState = history.pushState;

history.pushState = function(a, b, url) {
  pushState.call(history, a, b, url);
  if (url.indexOf('#') < 0) {
    scrollTo(0, 0);
  }
};

window.onpopstate = function() {
  setTimeout(function() {
    document.body.scrollTop = scrollTop[location.pathname] || 0;
  });
};

window.addEventListener('scroll', function() {
  scrollTop[location.pathname] = document.body.scrollTop;
}, { passive: true });

class Cinelah extends Component {
  componentDidMount() {
    fetch(`${BUCKET}/showtimes.json`)
      .then(body => body.json())
      .then(({ cinemas, movies, showtimes }) => {
        const now = new Date();
        showtimes = showtimes
          .filter(function({ date, time }) {
            return isAfter(`${date} ${time}`, now);
          })
          .map(function(showtime) {
            return Object.assign({}, showtime,
              {
                movie: movies[showtime.movie].title,
                movieId: showtime.movie,
                cinema: cinemas[showtime.cinema].name,
                cinemaId: showtime.cinema,
                rating: movies[showtime.movie].rating,
                genre: movies[showtime.movie].genre,
                country: movies[showtime.movie].country
              });
          });

        if (Object.keys(movies).length) {
          const posters = Object.keys(movies).map(movie => `${BUCKET}/movies/${movie}/backdrop.jpg`);
          const assets = [
            '/',
            '/favicon.png',
            '/bundle.js',
            'https://storage.googleapis.com/cinelah-92dbb.appspot.com/showtimes.json'
          ];
          caches.open('cinelah')
            .then(function(cache) {
              return cache.addAll([
                ...assets,
                ...posters
              ]);
            });
        }

        this.setState({ cinemas, movies, showtimes });
      });
  }
  render(children, { showtimes = [], cinemas = {}, movies = {} }) {
    const header = function({ path }) {
      const title = getTitle(path);
      document.title = title ? `Cinelah: ${title}` : 'Cinelah';

      if (PRODUCTION) {
        ga('set', 'page', path);
        ga('send', 'pageview');
      }

      return (
        <header>
          <div><a href={getParentHref(path)}>{title || 'Cinelah'}</a></div>
          <div>
            <a href="/movies" class={path.includes('/movies') || path === '/' ? 'active' : ''} aria-label="Go to Now Showing">
              <svg aria-hidden="true" fill="#000000" height="48" viewBox="0 0 24 24" width="48" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
                <path d="M0 0h24v24H0z" fill="none"/>
              </svg>
            </a>
            <a href="/cinemas" class={path.includes('/cinemas') ? 'active' : ''} aria-label="Go to Movie Theaters">
              <svg aria-hidden="true" fill="#000000" height="48" viewBox="0 0 24 24" width="48" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                <path d="M0 0h24v24H0z" fill="none"/>
              </svg>
            </a>
          </div>
        </header>
      );

      function getTitle(url) {
        const id = url.split('/').pop();

        switch (true) {
          case id && /movies\/+/gi.test(url):
            return movies[id] && movies[id].title;
          case id && /cinemas\/+/gi.test(url):
            return cinemas[id] && cinemas[id].name;
          default:
            return '';
        }
      }

      function getParentHref(url) {
        const id = url.split('/').pop();

        switch (true) {
          case id && /movies\/+/gi.test(url):
            return movies[id] && movies[id].title && '/movies/';
          case id && /cinemas\/+/gi.test(url):
            return cinemas[id] && cinemas[id].name && '/cinemas/';
          default:
            return '/';
        }
      }
    };
    return (
      <main>
        <Match>{header}</Match>
        <Router>
          <Movies default path="/movies/" movies={movies} showtimes={showtimes} />
          <Movie path="/movies/:id" movies={movies} showtimes={showtimes} />
          <Cinemas path="/cinemas/" cinemas={cinemas} movies={movies} />
          <Cinema path="/cinemas/:id" cinemas={cinemas} showtimes={showtimes} />
        </Router>
      </main>
    );
  }
}

render(<Cinelah />, document.body);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

function Movies({ movies, showtimes }) {
  const moviesEls = Object.keys(movies)
    .map(function(id) {
      return {
        id: id,
        title: movies[id].title,
        rating: movies[id].rating,
        country: movies[id].country,
        genre: movies[id].genre,
        timings: showtimes.filter(({ movieId }) => movieId === id).length
      };
    })
    .map(function({ id, title, rating, genre, country, timings }) {
      const style = {
        backgroundImage: `url(${BUCKET}/movies/${id}/backdrop.jpg)`
      };
      return (
        <a href={`/movies/${id}`} class="movie-tile">
          <div class="movie-tile-poster" style={style}></div>
          <div class="movie-tile-description">
            <div class="movie-tile-description-title">{title}</div>
            <div class="movie-tile-description-subtitle">
              {!!rating && <div class="movie-tile-description-rating">
                <svg class="icon-star" fill="#FFFFFF" height="48" viewBox="0 0 24 24" width="48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0h24v24H0z" fill="none"/>
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    <path d="M0 0h24v24H0z" fill="none"/>
                </svg>
                {rating}
              </div>}
              {!!genre && <div class="movie-tile-description-rating">
                {genre}
              </div>}
              {!!country && <div class="movie-tile-description-rating">
                {country}
              </div>}
              <div class="movie-tile-description-rating">
                <svg class="icon-time" fill="#FFFFFF" height="48" viewBox="0 0 24 24" width="48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                    <path d="M0 0h24v24H0z" fill="none"/>
                    <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
                {timings}
              </div>
            </div>
          </div>
        </a>
      );
    });

  if (moviesEls.length) {
    return (
      <div class="movies">
        <h1>Now Showing</h1>
        {moviesEls}
      </div>
    );
  }

  const placeholder =
    <a class="movie-tile">
      <div class="movie-tile-poster"></div>
      <div class="movie-tile-description">
        <div class="movie-tile-description-title placeholder"></div>
        <div class="movie-tile-description-subtitle">
          <div class="movie-tile-description-rating placeholder"></div>
        </div>
      </div>
    </a>;

  return (
    <div class="movies">
      <h1>Now Showing</h1>
      {Array(20).fill(placeholder)}
    </div>
  );
}

function Movie({ id, movies, showtimes }) {
  const movieShowtimes = showtimes
    .filter(function({ movieId }) {
      return id === movieId;
    })
    .reduce(function(res, showtime) {
      const date = res.get(showtime.date) || { date: showtime.date, showtimes: [] };
      date.showtimes.push(showtime);
      res.set(showtime.date, date);
      return res;
    }, new Map());

  const list = Array.from(movieShowtimes.keys())
    .sort(function(a, b) {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    })
    .map(function(date) {
      const { showtimes } = movieShowtimes.get(date);
      const showtimesByCinema = showtimes
        .reduce(function(res, showtime) {
          const cinema = res.get(showtime.cinema) || { cinema: showtime.cinema, showtimes: [] };
          cinema.showtimes.push(showtime);
          res.set(showtime.cinema, cinema);
          return res;
        }, new Map());

      const list = Array.from(showtimesByCinema.keys())
        .sort(function(a, b) {
          if (a < b) return -1;
          if (a > b) return 1;
          return 0;
        })
        .map(function(cinema) {
          const { showtimes } = showtimesByCinema.get(cinema);
          const showtimesByCinemaEls = showtimes
            .sort(function(a, b) {
              if (parseInt(a.time) < 6) {
                a = addDays(`${a.date} ${a.time}`, 1);
              } else {
                a = addDays(`${a.date} ${a.time}`, 0);
              }

              if (parseInt(b.time) < 6) {
                b = addDays(`${b.date} ${b.time}`, 1);
              } else {
                b = addDays(`${b.date} ${b.time}`, 0);
              }

              if (isAfter(b, a)) return -1;
              if (isAfter(a, b)) return 1;
              return 0;
            })
            .map(function(showtime) {
              return <Time showtime={showtime} />;
            });
          const [group, name] = cinema.split(' - ');
          return (
            <article class="cinema-times">
              <div class="cinema-tile">
                <div class="cinema-tile-description-column-1">
                  <div class="cinema-tile-description-rating">{group}</div>
                </div>
                <div class="cinema-tile-description-title">{name}</div>
              </div>
              <div class="times">{showtimesByCinemaEls}</div>
            </article>
          );
        });
      return (
        <article>
          <h1>{displayDate(date)}</h1>
          <article>{list}</article>
        </article>
      );
    });

  if (list.length || !Object.keys(movies).length) {
    return <div>{list}</div>;
  }

  if (movies[id]) {
    return (
      <article>
        <h1 class="error">No timing found</h1>
        <section>
          <p>Go back to <a href="/movies">Now Showing</a>.</p>
        </section>
      </article>
    );
  }

  return (
    <article>
      <h1 class="error">Movie not found</h1>
      <section>
        <p>Go back to <a href="/movies">Now Showing</a>.</p>
      </section>
    </article>
  );
}

function Cinemas({ cinemas = {} }) {
  const cinemaEls = Object.keys(cinemas)
    .map(function(id) {
      const [group, name] = cinemas[id].name.split(' - ');
      return {
        id,
        group,
        name
      };
    })
    .sort(function(a, b) {
      a = a.group.toLowerCase() + a.name.toLowerCase();
      b = b.group.toLowerCase() + b.name.toLowerCase();
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    })
    .map(function({ id, group, name }) {
      return (
        <a class="cinema-tile" href={`/cinemas/${id}`}>
          <div class="cinema-tile-description-column-1">
            <div class="cinema-tile-description-rating">{group}</div>
          </div>
          <div class="cinema-tile-description-title">{name}</div>
        </a>
      );
    });

  return (
    <div class="cinemas">
      <h1>Movie Theaters</h1>
      {cinemaEls}
    </div>
  );
}

function Cinema({ cinemas, id, showtimes }) {
  const cinemaShowtimes = showtimes
    .filter(function({ cinemaId }) {
      return id === cinemaId;
    })
    .reduce(function(res, showtime) {
      const date = res.get(showtime.date) || { date: showtime.date, showtimes: [] };
      date.showtimes.push(showtime);
      res.set(showtime.date, date);
      return res;
    }, new Map());

  const list = Array.from(cinemaShowtimes.keys())
    .sort(function(a, b) {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    })
    .map(function(date) {
      const { showtimes } = cinemaShowtimes.get(date);
      const showtimesByMovie = showtimes
        .reduce(function(res, showtime) {
          const movie = res.get(showtime.movie) || { movie: showtime.movie, movieId: showtime.movieId, rating: showtime.rating, country: showtime.country, genre: showtime.genre, showtimes: [] };

          movie.showtimes.push(showtime);
          res.set(showtime.movie, movie);
          return res;
        }, new Map());

      const list = Array.from(showtimesByMovie.keys())
        .map(function(movie) {
          const { showtimes, movieId, rating, genre, country } = showtimesByMovie.get(movie);
          const showtimesByCinemaEls = showtimes
            .sort(function(a, b) {
              if (parseInt(a.time) < 6) {
                a = addDays(`${a.date} ${a.time}`, 1);
              } else {
                a = addDays(`${a.date} ${a.time}`, 0);
              }

              if (parseInt(b.time) < 6) {
                b = addDays(`${b.date} ${b.time}`, 1);
              } else {
                b = addDays(`${b.date} ${b.time}`, 0);
              }

              if (isAfter(b, a)) return -1;
              if (isAfter(a, b)) return 1;
              return 0;
            })
            .map(function(showtime) {
              return <Time showtime={showtime} />;
            });

          const style = {
            backgroundImage: `url(${BUCKET}/movies/${movieId}/backdrop.jpg)`
          };

          return (
            <article class="movie-times">
              <div class="movie-tile">
                <div class="movie-tile-poster" style={style}></div>
                <div class="movie-tile-description">
                  <div class="movie-tile-description-title">{movie}</div>
                  <div class="movie-tile-description-subtitle">
                    {!!rating && <div class="movie-tile-description-rating">
                      <svg class="icon-star" fill="#FFFFFF" height="48" viewBox="0 0 24 24" width="48" xmlns="http://www.w3.org/2000/svg">
                          <path d="M0 0h24v24H0z" fill="none"/>
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                          <path d="M0 0h24v24H0z" fill="none"/>
                      </svg>
                      {rating}
                    </div>}
                    {!!genre && <div class="movie-tile-description-rating">
                      {genre}
                    </div>}
                    {!!country && <div class="movie-tile-description-rating">
                      {country}
                    </div>}
                  </div>
                </div>
              </div>
              <div class="times">{showtimesByCinemaEls}</div>
            </article>
          );
        });
      return (
        <article>
          <h1>{displayDate(date)}</h1>
          <article>{list}</article>
        </article>
      );
    });

  if (list.length || !Object.keys(cinemas).length) {
    return <div>{list}</div>;
  }

  if (cinemas[id]) {
    return (
      <article>
        <h1 class="error">No timing found</h1>
        <section>
          <p>Go back to <a href="/cinemas">Movie Theaters</a>.</p>
        </section>
      </article>
    );
  }

  return (
    <article>
      <h1 class="error">Cinema not found</h1>
      <section>
        <p>Go back to <a href="/cinemas">Movie Theaters</a>.</p>
      </section>
    </article>
  );
}

function Time({ showtime = {} }) {
  return <a class="time" href={showtime.url}>{showtime.time}</a>;
}

function displayDate(date) {
  if (isToday(date)) {
    return 'Today';
  } else if (isTomorrow(date)) {
    return 'Tomorrow';
  } else {
    return format(date, 'dddd D MMM');
  }
}
