# ngx-calendar-range-picker

> ⚠️ **Disclaimer:** This library is **no longer actively maintained** (maintenance mode). Use it at your own risk.  
> 🚀 **Heads-up:** Version 2 is currently under active development with enhanced UX/UI, improved accessibility (a11y), and compatibility with the latest Angular.

> Angular 2+ Date range picker.

This `Angular Material` plugin is compatible with Angular 2+ and is Ivy compatible. It leverages `moment.js` to handle date manipulation and parsing. The base for this plugin was originally the [Bootstrap Date Range Picker](http://www.daterangepicker.com), but its dependencies on jQuery and Bootstrap were removed. `Angular Material` themes are fully supported since v3.0.0, so you can just drop this component into an existing Material project and it will blend right into your application.

![](screen.png)

---

## Installation

 Install the plugin from npm:

 `npm install ngx-calendar-range-picker --save` .

 import **NgxDaterangepickerMd** in your module:

````typescript
...
import { FormsModule } from '@angular/forms';
import { NgxDaterangepickerMd } from 'ngx-calendar-range-picker';
import { App } from './app';

@NgModule({
    imports: [
        ... ,
        FormsModule,
        NgxDaterangepickerMd.forRoot()
    ],
    declarations: [App],
    bootstrap:    [App]
})
export class AppModule {}
````

## Usage example

Html:

```html
<input type="text" ngxDaterangepickerMd [(ngModel)]="selected" class="form-control"/>
```
Typescript:

````typescript
selected: {startDate: Moment, endDate: Moment};
````
### with some options:
Html:

```html
<input type="text" matInput
    ngxDaterangepickerMd
    [locale]="{applyLabel: 'ok', format: 'DD-MM-YYYY'}"
    startKey="start"
    endKey="end"
    [(ngModel)]="selected"
    name="daterange"/>
```
Typescript:

````typescript
selected: {start: Moment, end: Moment};
````

## Inline usage

You can use the component directly in your templates, which will set its `inline` mode to **true**, in which case the calendar won't hide after date/range selection. You can then use the events: `rangeClicked` or `datesUpdated` or `choosedDate` to get its selection state.

```html
<ngx-calendar-range-picker (choosedDate)="choosedDate($event)">
</ngx-calendar-range-picker>
```


## Available options

### autoApply, showDropdowns, singleDatePicker, showWeekNumbers, showISOWeekNumbers, alwaysShowCalendars, showClearButton, showCancel

>These options are booleans

### isCustomDate

>(function) A function that is passed each date in the calendars before they are displayed, and may return a string or array of CSS class names to apply to that date's calendar cell

### isInvalidDate
>(function) A function that is passed each date in the two calendars before they are displayed, and may return true or false to indicate whether that date should be available for selection or not.

### isTooltipDate
>(function) A function that is passed each date in the two calendars before they are displayed, and may return a text to be displayed as a tooltip.

### minDate, maxDate

 >To set the minimal and maximal date, these options are a moment date

### dateLimit

 >To set max number of the date we can choose

### locale

>the locale options is an object with:
```javascript
{
    format: 'MM/DD/YYYY', // could be 'YYYY-MM-DDTHH:mm:ss.SSSSZ'
    displayFormat: 'MM/DD/YYYY', // default is format value
    direction: 'ltr', // could be rtl
    weekLabel: 'W',
    separator: ' To ', // default is ' - '
    cancelLabel: 'Cancel', // detault is 'Cancel'
    applyLabel: 'Okay', // detault is 'Apply'
    clearLabel: 'Clear', // detault is 'Clear'
    customRangeLabel: 'Custom range',
    daysOfWeek: moment.weekdaysMin(),
    monthNames: moment.monthsShort(),
    firstDay: 1 // first day is monday
}
```
[Check here](#global-locale) for setting the global locale

### startKey and endKey

Theses 2 options are for the key you want for the value, default are `startDate` and `endDate`, it means the value we have from ngModel are: `{startDate: Date, endDate: Date}` by default;

Specifiyng `startKey` and `endKey` would have different model:

example:
```html
<input type="text" ngxDaterangepickerMd startKey="start" endKey="end" [(ngModel)]="model">
```

the model we got would be:  `{start: Date, end: Date}`

### ranges

(object) Set predefined date ranges the user can select from. Each key is the label for the range, and its value an array with two dates representing the bounds of the range. As an example:
```html
<input type="text" ngxDaterangepickerMd startKey="start" endKey="end" [ranges]="ranges" [(ngModel)]="model">
```
```javascript
ranges: any = {
    'Today': [moment(), moment()],
    'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
    'Last 7 Days': [moment().subtract(6, 'days'), moment()],
    'Last 30 Days': [moment().subtract(29, 'days'), moment()],
    'This Month': [moment().startOf('month'), moment().endOf('month')],
    'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
  }
```
#### Other options with ranges

You can use bellow options when using the ranges. The default are `false`.

| Attribut | Type |Description |
| --- | --- |--- |
| alwaysShowCalendars | boolean | set to `true` if you want to display the ranges with the calendar |
| keepCalendarOpeningWithRange | boolean | set to `true` if you want the calendar won't be closed after choosing a range |
| showRangeLabelOnInput | boolean | set to `true` if you want to display the range label on input |
| customRangeDirection | boolean | set to `true` if you want to allow selection range from end date first |
| lockStartDate | boolean | set to `true` if you want to lock start date and change only the end date |

#### Open datepicker from outside

It is possible to open datepicker from outside. You should create an input with attached datepicker directive and a button with "ngx-daterangepicker-action" class (to prevent triggering of clickOutside).
```html
    <input
      ngxDaterangepickerMd
      [closeOnAutoApply]="true"
      [autoApply]="true"
      [singleDatePicker]="true"
      [linkedCalendars]="true"
      [(ngModel)]="selected"
      (datesUpdated)="datesUpdated($event)"
      class="datepicker-calendar-icon">

    <a class="ngx-daterangepicker-action" (click)="openDatepicker()">
      Open
    </a>
```

```javascript

  ...
    @ViewChild(DaterangepickerDirective, { static: false }) pickerDirective: DaterangepickerDirective;
  ...
  ...
  openDatepicker() {
    this.pickerDirective.open();
  }
```

### Timepicker

You have to set the attribute `timePicker` to `true` if you want to enable the timepicker.

You can use theses options:

| Attribut | Type |Description |
| --- | --- |--- |
| timePicker24Hour | boolean | set to `true` if you want to set the timepicker to 24h instead of having AM and PM |
| timePickerIncrement | number | set the value increment of the minutes (eg: for `12` there would be 0mn, 15mn, 30mn, 45mn,) |
| timePickerSeconds | boolean | set `true` if you want do display second's select |


### Customisation

| Attribut | Type |Description |
| --- | --- |--- |
| firstMonthDayClass | string | add a custom class for all first day of the month |
| lastMonthDayClass | string | add a custom class for all last day of the month |
| emptyWeekRowClass | string | add a custom class in a row with a date in a week not in the current month |
| emptyWeekColumnClass | string | add a custom class for all date in a week not in the current month |
| lastDayOfPreviousMonthClass | string | add a custom class for the last day of the previous month |
| firstDayOfNextMonthClass | string | add a custom class for the first day of the next month |

### Positioning

| Attribut | Possible values |Description |
| --- | --- |--- |
| opens | left, center, right | position the calendar from the input element |
| drops | up, down | position the calendar to the up or down of the calendar |

## Available events

### \(rangeClicked)

 >Fired when clicked on range, and send an object with range label and dates value, eg:  `{label: 'This Month', dates: [Moment, Moment]}`

### \(datesUpdated)

 >Fires when the date model is updated, like applying (if you have activated the apply button), or when selecting a range or date without the apply button, and sends an object containing start and end dates, eg: `{startDate: Moment, endDate: Moment}`

### Global locale

For setting the global locale, pass this object to NgxDaterangepickerMd.forRoot().

eg:

```
@NgModule({
    imports: [
        ... ,
        FormsModule,
        NgxDaterangepickerMd.forRoot({
            separator: ' - ',
            applyLabel: 'Okay',
        })
    ],
    declarations: [App],
    bootstrap:    [App]
})
```

## Development

### Prepare your environment

Install local dependencies: `npm install`.

### Development server

Run `npm start` to start a development server on a port 4200.

Open `http//:localhost:4200` on your browser.

## Tests

Run `npm test` or `ng test` to run tests.


## [License](https://github.com/pranavkumar389/ngx-calendar-range-picker/blob/master/LICENSE)
MIT
