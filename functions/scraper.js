const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment');
const phantom = require('phantom');
const url = require('url');
const { dateFormat, timeFormat } = require('./formatter');

module.exports = {
  getCathayJson,
  getFilmgardeJson,
  getGVJson,
  getShawJson,
  getWeJson
};

const SHAW = 'http://m.shaw.sg/';

function getShawJson() {
  return phantom.create(['--load-images=no'])
    .then(function(instance) {
      return instance.createPage()
        .then(function(page) {
          return page.open(SHAW)
            .then(function() {
              return page.property('content');
            })
            .then(function(content) {
              const dates = parseShawMobileDates(content);
              return dates.reduce(function(res, date) {
                return res.then(function() {
                  const promise = new Promise(resolve => {
                    page.on('onLoadFinished', function() {
                      page.off('onLoadFinished');
                      resolve(page.property('content'));
                    });
                  });

                  page.evaluate(function(date) {
                    document.querySelector('#globalform').ddlShowDate.value = date;
                    return document.querySelector('[type=\"submit\"]').click();
                  }, date.date);

                  return promise;
                })
                .then(function(content) {
                  date.cinemas = parseShawMobileDay(content);
                  return dates;
                });
              }, Promise.resolve());
            });
        })
        .then(function(content) {
          instance.exit();
          return content;
        });
    });
}

function parseShawMobileDates(page) {
  const $ = cheerio.load(page);
  return $('#ddlShowDate option')
    .map(function(i, el) {
      const date = $(el).attr('value');
      const formattedDate = moment(date, 'M/DD/YYYY').format(dateFormat);
      return {
        date: formattedDate
      };
    })
    .get();
}

function parseShawMobileDay(page) {
  const $ = cheerio.load(page);
  return $('.persist-area')
    .map(function(i, el) {
      return {
        name: $('.floatingHeader .category.cplex.header', el).text(),
        movies: $('.filminfo', el)
          .map(function(i, el) {
            return {
              title: $('.filmtitle', el).text(),
              timings: $('.filmshowtime a', el)
                .map(function(i, el) {
                  return {
                    time: moment($(el).text(), 'k:mmA').format(timeFormat),
                    url: url.resolve(SHAW, $(el).attr('href'))
                  };
                })
                .get()
            };
          })
          .get()
      };
    })
    .get();
}

const CATHAY = 'http://www.cathaycineplexes.com.sg/showtimes/';

function getCathay() {
  return phantom.create(['--load-images=no'])
    .then(function(instance) {
      return instance.createPage()
        .then(function(page) {
          return page.open(CATHAY)
            .then(function() {
              const content = page.property('content');
              return page.close()
                .then(function() {
                  return content;
                });
            });
        })
        .then(function(content) {
          instance.exit();
          return content;
        });
    });
}

function parseCathay(page) {
  const $ = cheerio.load(page, {
    normalizeWhitespace: true
  });
  return $('.tabs')
    .map(function(i, el) {
      return {
        name: $('.M_movietitle', el).text().trim() || 'PLATINUM MOVIE SUITES',
        dates: $('.tabbers', el)
          .map(function(i, el) {
            const date = $(`#${$(el).attr('aria-labelledby')} .smalldate`, $(el).parent()).text();
            const formattedDate = moment(date, 'DD MMM').format(dateFormat);
            return {
              date: formattedDate,
              movies: $('.movie-container', el)
                .filter(function(i, el) {
                  return $('.mobileLink', el).text();
                })
                .map(function(i, el) {
                  return {
                    title: $('.mobileLink', el).text(),
                    timings: $('.cine_time', el)
                      .map(function(i, el) {
                        return {
                          time: $(el).text(),
                          url: url.resolve(SHAW, $(el).attr('href'))
                        };
                      })
                      .get()
                  };
                })
                .get()
            };
          })
          .get()
      };
    })
    .get();
}

function getCathayJson() {
  return getCathay()
    .then(parseCathay);
}

const GV_CINEMAS = 'https://www.gv.com.sg/GVCinemas';

function getGVCinemas() {
  return phantom.create(['--load-images=no'])
    .then(function(instance) {
      return instance.createPage()
        .then(function(page) {
          return page.open(GV_CINEMAS)
            .then(function() {
              return page.property('content');
            })
            .then(function(content) {
              return page.close()
                .then(function() {
                  return content;
                });
            });
        })
        .then(function(content) {
          instance.exit();
          return content;
        });
    });
}

function parseGVCinemas(page) {
  const $ = cheerio.load(page);
  return [... parseList(), ... parseCards()];

  function parseList() {
    return $('.cinemas-list li')
      .map(function(i, el) {
        return {
          name: $(el).text(),
          url: url.resolve(GV_CINEMAS, $('a', el).attr('href'))
        };
      })
      .get();
  }

  function parseCards() {
    return $('.brand-cinemas-list .col-lg-4')
      .map(function(i, el) {
        return {
          name: $('.heading img', el).attr('alt'),
          url: url.resolve(GV_CINEMAS, $('a', el).attr('href'))
        };
      })
      .get();
  }
}

function getGVCinemaRequests(cinemas) {
  return phantom.create(['--load-images=no'])
    .then(function(instance) {
      return instance.createPage()
        .then(function(page) {
          return cinemas.reduce(function(res, cinema) {
            return res.then(function() {
              const promise = new Promise(function(resolve) {
                page.on('onResourceRequested', function(request) {
                  if (!request.url.includes('session')) {
                    return;
                  }
                  page.off('onResourceRequested');
                  page.stop();
                  cinema.request = request;
                  resolve(cinemas);
                });
              });
              page.open(cinema.url).catch(() => {});
              return promise;
            });
          }, Promise.resolve())
          .then(function(requests) {
            return page.close()
              .then(function() {
                instance.exit();
                return requests;
              });
          });
        });
    });
}

function parseGVCinemaJSON(json) {
  return json.films.map(function(film) {
    return {
      title: film.filmTitle,
      dates: film.dates.map(function({ date, times }) {
        var ddmmyyyy = moment(new Date(date)).format(dateFormat);
        return {
          date: ddmmyyyy,
          timings: times.map(function(timing) {
            return {
              time: moment(timing.time24, 'kkmm').format(timeFormat),
              url: `https://www.gv.com.sg/GVSeatSelection#/cinemaId/${json.id}/filmCode/${film.filmCd}/showDate/${ddmmyyyy}/showTime/${timing.time24}/hallNumber/${timing.hallNumber}`
            };
          })
        };
      })
    };
  })
  .filter(function({ title }) {
    return title !== 'Zen Zone 2017*';
  });
}

function replayGVCinemaRequest(cinema) {
  return axios.post(cinema.request.url, cinema.request.postData, {
    headers: cinema.request.headers.reduce(function(res, item) {
      res[item.name] = item.value;
      return res;
    }, {})
  })
    .then(function(response) {
      delete cinema.request;
      cinema.movies = parseGVCinemaJSON(response.data.data[0]);
      return cinema;
    });
}

function getGVJson() {
  return getGVCinemas()
  .then(parseGVCinemas)
  .then(getGVCinemaRequests)
  .then(function(cinemas) {
    return Promise.all(cinemas.map(replayGVCinemaRequest));
  });
}

const FILMGARDE = 'http://tickets.fgcineplex.com.sg/visInternetTicketing/';

function getFilmgardeJson() {
  return phantom.create(['--load-images=no'])
    .then(function(instance) {
      return instance.createPage()
        .then(function(page) {
          return page.open(FILMGARDE)
            .then(function() {
              return page.property('content');
            })
            .then(function(content) {
              const dates = parseFilmgardeDates(content);
              return dates.reduce(function(res, date) {
                return res.then(function() {
                  const promise = new Promise(resolve => {
                    page.on('onLoadFinished', function() {
                      page.off('onLoadFinished');
                      resolve(page.property('content'));
                    });
                  });

                  page.evaluate(function(date) {
                    document.querySelector('[name="ddlFilterDate"]').value = date;
                    return document.querySelector('[name="ddlFilterDate"]').onchange();
                  }, date.date);

                  return promise;
                })
                .then(function(content) {
                  date.cinemas = parseFilmgardeDay(content);
                  return dates;
                });
              }, Promise.resolve());
            });
        })
        .then(function(content) {
          instance.exit();
          return content;
        });
    });
}

function parseFilmgardeDates(page) {
  const $ = cheerio.load(page);
  return $('#ddlFilterDate option')
    .map(function(i, el) {
      const date = $(el).attr('value');
      const formattedDate = moment(date, 'DD MMM').format(dateFormat);
      return {
        date: formattedDate
      };
    })
    .get();
}

function parseFilmgardeDay(page) {
  const $ = cheerio.load(page, {
    normalizeWhitespace: true
  });
  return $('.ShowtimesCinemaRow')
    .map(function(i, el) {
      return {
        name: $(el).text().trim(),
        movies: $(el).nextUntil('.ShowtimesCinemaRow')
          .map(function(i, el) {
            return {
              title: $('.ShowtimesMovieLink', el).text(),
              timings: $('.ShowtimesSessionLink', el)
                .map(function(i, el) {
                  return {
                    time: $(el).text(),
                    url: url.resolve(FILMGARDE, $(el).attr('href'))
                  };
                })
                .get()
            };
          })
          .get()
      };
    })
    .get();
}

const WE_CINEMAS = 'https://www.wecinemas.com.sg/buy-ticket.aspx';

function getWe() {
  return phantom.create(['--load-images=no'])
    .then(function(instance) {
      return instance.createPage()
        .then(function(page) {
          return page.open(WE_CINEMAS)
            .then(function() {
              return page.property('content');
            });
        })
        .then(function(content) {
          instance.exit();
          return content;
        });
    });
}

function parseWe(page) {
  const $ = cheerio.load(page, {
    normalizeWhitespace: true
  });
  return $('#DataListCinemas h2')
    .map(function(i, el) {
      return {
        name: $(el).text().trim(),
        dates: $('.showtime-date-con', $(el).closest('table'))
          .map(function(i, el) {
            const date = $('.showtime-date', el).text();
            const formattedDate = moment(date, 'D MMMM YYYY, dddd').format(dateFormat);
            return {
              date: formattedDate,
              movies: $('h3', $(el).closest('table'))
                .map(function(i, el) {
                  return {
                    title: $(el).text(),
                    timings: $('.showtimes-but', $(el).closest('tr').next().next().next())
                      .map(function(i, el) {
                        return {
                          time: moment($(el).text(), 'k:mmA').format(timeFormat),
                          url: url.resolve(WE_CINEMAS, $('a', el).attr('href'))
                        };
                      })
                      .get()
                  };
                })
                .get()
            };
          })
          .get()
      };
    })
    .get();
}

function getWeJson() {
  return getWe()
    .then(parseWe);
}
