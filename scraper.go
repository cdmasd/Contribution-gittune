package main

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

type Contribution struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

func FetchContributionsData(username string) ([]Contribution, error) {
	url := fmt.Sprintf("https://github.com/users/%s/contributions", username)
	res, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode == 404 {
		return nil, fmt.Errorf("GitHub user '%s' not found", username)
	} else if res.StatusCode != 200 {
		return nil, fmt.Errorf("failed to fetch user %s: status %d", username, res.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return nil, err
	}

	tooltips := make(map[string]int)
	doc.Find("tool-tip").Each(func(i int, s *goquery.Selection) {
		forAttr, exists := s.Attr("for")
		if !exists {
			return
		}
		text := s.Text()
		
		var count int
		if strings.HasPrefix(strings.ToLower(text), "no contributions") {
			count = 0
		} else {
			parts := strings.Split(strings.TrimSpace(text), " ")
			if len(parts) > 0 {
				c, err := strconv.Atoi(parts[0])
				if err == nil {
					count = c
				}
			}
		}
		tooltips[forAttr] = count
	})

	var contributions []Contribution

	doc.Find("td.ContributionCalendar-day").Each(func(i int, s *goquery.Selection) {
		date, exists := s.Attr("data-date")
		if !exists {
			return
		}
		id, idExists := s.Attr("id")
		count := 0
		if idExists {
			count = tooltips[id]
		}

		contributions = append(contributions, Contribution{
			Date:  date,
			Count: count,
		})
	})

	return contributions, nil
}
