import { ChangeDetectorRef, Component, ElementRef, EventEmitter, forwardRef, Input, OnInit, Output, ViewChild, ViewEncapsulation, HostListener } from '@angular/core';
import { FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import * as _moment from 'moment';
import { LocaleConfig } from './daterangepicker.config';
import { LocaleService } from './locale.service';
import { LiveAnnouncer } from '@angular/cdk/a11y';

const moment = _moment;

export enum SideEnum {
    left = 'left',
    right = 'right'
}

@Component({
    selector: 'ngx-calendar-range-picker',
    styleUrls: ['./daterangepicker.component.scss'],
    templateUrl: './daterangepicker.component.html',
    host: {
    '(click)': 'handleInternalClick($event)',
    },
    encapsulation: ViewEncapsulation.None,
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => DaterangepickerComponent),
        multi: true
    }]
})
export class DaterangepickerComponent implements OnInit {
    private _old: {start: any, end: any} = {start: null, end: null};
    private _previousFocus: HTMLElement | null = null;
    chosenLabel: string;
    calendarVariables: {left: any, right: any} = {left: {}, right: {}};
    tooltiptext = [];  // for storing tooltiptext
    timepickerVariables: {left: any, right: any} = {left: {}, right: {}};
    daterangepicker: {start: FormControl, end: FormControl} = {start: new FormControl(), end: new FormControl()};
    applyBtn: {disabled: boolean} = {disabled: false};
    @Input()
    startDate = moment().startOf('day');
    @Input()
    endDate = moment().endOf('day');

    @Input()
    dateLimit: number = null;
    // used in template for compile time support of enum values.
    sideEnum = SideEnum;

    @Input()
    minDate: _moment.Moment = null;
    @Input()
    maxDate: _moment.Moment = null;
    @Input()
    autoApply: Boolean = false;
    @Input()
    singleDatePicker: Boolean = false;
    @Input()
    showDropdowns: Boolean = false;
    @Input()
    showWeekNumbers: Boolean = false;
    @Input()
    showISOWeekNumbers: Boolean = false;
    @Input()
    linkedCalendars: Boolean = false;
    @Input()
    autoUpdateInput: Boolean = true;
    @Input()
    alwaysShowCalendars: Boolean = false;
    @Input()
    maxSpan: Boolean = false;
    @Input()
    lockStartDate: Boolean = false;
    // timepicker variables
    @Input()
    timePicker: Boolean = false;
    @Input()
    timePicker24Hour: Boolean = false;
    @Input()
    timePickerIncrement = 1;
    @Input()
    timePickerSeconds: Boolean = false;
    // end of timepicker variables
    @Input()
    showClearButton: Boolean = false;
    @Input()
    firstMonthDayClass: string = null;
    @Input()
    lastMonthDayClass: string = null;
    @Input()
    emptyWeekRowClass: string = null;
    @Input()
    emptyWeekColumnClass: string = null;
    @Input()
    firstDayOfNextMonthClass: string = null;
    @Input()
    lastDayOfPreviousMonthClass: string = null;

    _locale: LocaleConfig = {};
    @Input() set locale(value) {
      this._locale = {...this._localeService.config, ...value};
    }
    get locale(): any {
      return this._locale;
    }
    // custom ranges
    _ranges: any = {};

    @Input() set ranges(value) {
        this._ranges = value;
        this.renderRanges();
    }
    get ranges(): any {
        return this._ranges;
    }

    @Input()
    showCustomRangeLabel: boolean;
    @Input()
    showCancel = false;
    @Input()
    keepCalendarOpeningWithRange = false;
    @Input()
    showRangeLabelOnInput = false;
    @Input()
    customRangeDirection = false;
    chosenRange: string;
    rangesArray: Array<any> = [];

    // some state information
    isShown: Boolean = false;
    inline = true;
    leftCalendar: any = {};
    rightCalendar: any = {};
    showCalInRanges: Boolean = false;
    nowHoveredDate = null;
    pickingDate: boolean = false;
    options: any = {} ; // should get some opt from user
    @Input() drops: string;
    @Input() opens: string;
    @Input() closeOnAutoApply = true;
    @Output() choosedDate: EventEmitter<Object>;
    @Output() rangeClicked: EventEmitter<Object>;
    @Output() datesUpdated: EventEmitter<Object>;
    @Output() startDateChanged: EventEmitter<Object>;
    @Output() endDateChanged: EventEmitter<Object>;
    @ViewChild('pickerContainer', { static: true }) pickerContainer: ElementRef;

    constructor(
        private el: ElementRef,
        private _ref: ChangeDetectorRef,
        private _localeService: LocaleService,
        private _liveAnnouncer: LiveAnnouncer
    ) {
        this.choosedDate = new EventEmitter();
        this.rangeClicked = new EventEmitter();
        this.datesUpdated = new EventEmitter();
        this.startDateChanged = new EventEmitter();
        this.endDateChanged = new EventEmitter();
    }

    /** Helper: announce a message to screen-reader users */
    private announce(msg: string): void {
        this._liveAnnouncer.announce(msg);
    }

    ngOnInit() {
        this._buildLocale();
        const daysOfWeek = [...this.locale.daysOfWeek];
        this.locale.firstDay = this.locale.firstDay % 7;
        if (this.locale.firstDay !== 0) {
            let iterator = this.locale.firstDay;

            while (iterator > 0) {
                daysOfWeek.push(daysOfWeek.shift());
                iterator--;
            }
        }
        this.locale.daysOfWeek = daysOfWeek;
        if (this.inline) {
            this._old.start = this.startDate.clone();
            this._old.end = this.endDate.clone();
        }

        if (this.startDate && this.timePicker) {
          this.setStartDate(this.startDate);
          this.renderTimePicker(SideEnum.left);
        }

        if (this.endDate && this.timePicker) {
          this.setEndDate(this.endDate);
          this.renderTimePicker(SideEnum.right);
        }

        this.updateMonthsInView();
        this.renderCalendar(SideEnum.left);
        this.renderCalendar(SideEnum.right);
        this.renderRanges();

        // Ensure focus-trap anchors are not tabbable when picker starts closed
        if (!this.isShown && !this.inline) {
            setTimeout(() => this.toggleFocusTrapAnchors(false));
        }
    }
    renderRanges() {
        this.rangesArray = [];
        let start, end;
        if (typeof this.ranges === 'object') {
            for (const range in this.ranges) {
                if (this.ranges[range]) {
                    if (typeof this.ranges[range][0] === 'string') {
                        start = moment(this.ranges[range][0], this.locale.format);
                    } else {
                        start = moment(this.ranges[range][0]);
                    }
                    if (typeof this.ranges[range][1] === 'string') {
                        end = moment(this.ranges[range][1], this.locale.format);
                    } else {
                        end = moment(this.ranges[range][1]);
                    }
                    // If the start or end date exceed those allowed by the minDate or maxSpan
                    // options, shorten the range to the allowable period.
                    if (this.minDate && start.isBefore(this.minDate)) {
                        start = this.minDate.clone();
                    }
                    let maxDate = this.maxDate;
                    if (this.maxSpan && maxDate && start.clone().add(this.maxSpan).isAfter(maxDate)) {
                        maxDate = start.clone().add(this.maxSpan);
                    }
                    if (maxDate && end.isAfter(maxDate)) {
                        end = maxDate.clone();
                    }
                    // If the end of the range is before the minimum or the start of the range is
                    // after the maximum, don't display this range option at all.
                    if ((this.minDate && end.isBefore(this.minDate, this.timePicker ? 'minute' : 'day'))
                    || (maxDate && start.isAfter(maxDate, this.timePicker ? 'minute' : 'day'))) {
                        continue;
                    }
                    // Support unicode chars in the range names.
                    const elem = document.createElement('textarea');
                    elem.innerHTML = range;
                    const rangeHtml = elem.value;
                    this.ranges[rangeHtml] = [start, end];
                }
            }
            for (const range in this.ranges) {
                if (this.ranges[range]) {
                    this.rangesArray.push(range);
                }
            }
            if (this.showCustomRangeLabel) {
                this.rangesArray.push(this.locale.customRangeLabel);
            }
            this.showCalInRanges = (!this.rangesArray.length) || this.alwaysShowCalendars;
            if (!this.timePicker) {
                this.startDate = this.startDate.startOf('day');
                this.endDate = this.endDate.endOf('day');
            }
        }

    }
    renderTimePicker(side: SideEnum) {        
        let selected, minDate;
        const maxDate = this.maxDate;
        if (side === SideEnum.left) {
            selected = this.startDate.clone(),
            minDate = this.minDate;
        } else if (side === SideEnum.right && this.endDate) {
            selected = this.endDate.clone(),
            minDate = this.startDate;
        } else if (side === SideEnum.right && !this.endDate) {
            // don't have an end date, use the start date then put the selected time for the right side as the time
            selected = this._getDateWithTime(this.startDate, SideEnum.right);
            if(selected.isBefore(this.startDate)){
                selected = this.startDate.clone();  //set it back to the start date the time was backwards
            }
            minDate = this.startDate;
        }
        const start = this.timePicker24Hour ? 0 : 1;
        const end = this.timePicker24Hour ? 23 : 12;
        this.timepickerVariables[side] = {
            hours: [],
            minutes: [],
            minutesLabel: [],
            seconds: [],
            secondsLabel: [],
            disabledHours: [],
            disabledMinutes: [],
            disabledSeconds: [],
            selectedHour: 0,
            selectedMinute: 0,
            selectedSecond: 0,
        };
        // generate hours
        for (let i = start; i <= end; i++) {
            let i_in_24 = i;
            if (!this.timePicker24Hour) {
                i_in_24 = selected.hour() >= 12 ? (i === 12 ? 12 : i + 12) : (i === 12 ? 0 : i);
            }

            const time = selected.clone().hour(i_in_24);
            let disabled = false;
            if (minDate && time.minute(59).isBefore(minDate)) {
                disabled = true;
            }
            if (maxDate && time.minute(0).isAfter(maxDate)) {
                disabled = true;
            }

            this.timepickerVariables[side].hours.push(i);
            if (i_in_24 === selected.hour() && !disabled) {
                this.timepickerVariables[side].selectedHour = i;
            } else if (disabled) {
                this.timepickerVariables[side].disabledHours.push(i);
            }
        }
        
        // generate minutes
        for (let i = 0; i < 60; i += this.timePickerIncrement) {
            const padded = i < 10 ? '0' + i : i;
            const time = selected.clone().minute(i);

            let disabled = false;
            if (minDate && time.second(59).isBefore(minDate)) {
                disabled = true;
            }
            if (maxDate && time.second(0).isAfter(maxDate)) {
                disabled = true;
            }
            this.timepickerVariables[side].minutes.push(i);
            this.timepickerVariables[side].minutesLabel.push(padded);
            if (selected.minute() === i && !disabled) {
                this.timepickerVariables[side].selectedMinute = i;
            } else if (disabled) {
                this.timepickerVariables[side].disabledMinutes.push(i);
            }
        }
        // generate seconds
        if (this.timePickerSeconds) {
            for (let i = 0; i < 60; i++) {
                const padded = i < 10 ? '0' + i : i;
                const time = selected.clone().second(i);

                let disabled = false;
                if (minDate && time.isBefore(minDate)) {
                    disabled = true;
                }
                if (maxDate && time.isAfter(maxDate)) {
                    disabled = true;
                }

                this.timepickerVariables[side].seconds.push(i);
                this.timepickerVariables[side].secondsLabel.push(padded);
                if (selected.second() === i && !disabled) {
                    this.timepickerVariables[side].selectedSecond = i;
                } else if (disabled) {
                    this.timepickerVariables[side].disabledSeconds.push(i);
                }
            }
        }
        // generate AM/PM
        if (!this.timePicker24Hour) {

            const am_html = '';
            const pm_html = '';

            if (minDate && selected.clone().hour(12).minute(0).second(0).isBefore(minDate)) {
                this.timepickerVariables[side].amDisabled = true;
            }

            if (maxDate && selected.clone().hour(0).minute(0).second(0).isAfter(maxDate)) {
                this.timepickerVariables[side].pmDisabled = true;
            }
            if (selected.hour() >= 12) {
                this.timepickerVariables[side].ampmModel = 'PM';
            } else {
                this.timepickerVariables[side].ampmModel = 'AM';
            }
        }
        this.timepickerVariables[side].selected = selected;
    }
    renderCalendar(side: SideEnum) { // side enum
        const mainCalendar: any = ( side === SideEnum.left ) ? this.leftCalendar : this.rightCalendar;
        const month = mainCalendar.month.month();
        const year = mainCalendar.month.year();
        const hour = mainCalendar.month.hour();
        const minute = mainCalendar.month.minute();
        const second = mainCalendar.month.second();
        const daysInMonth = moment([year, month]).daysInMonth();
        const firstDay = moment([year, month, 1]);
        const lastDay = moment([year, month, daysInMonth]);
        const lastMonth = moment(firstDay).subtract(1, 'month').month();
        const lastYear = moment(firstDay).subtract(1, 'month').year();
        const daysInLastMonth = moment([lastYear, lastMonth]).daysInMonth();
        const dayOfWeek = firstDay.day();
        // initialize a 6 rows x 7 columns array for the calendar
        const calendar: any = [];
        calendar.firstDay = firstDay;
        calendar.lastDay = lastDay;

        for (let i = 0; i < 6; i++) {
            calendar[i] = [];
        }

        // populate the calendar with date objects
        let startDay = daysInLastMonth - dayOfWeek + this.locale.firstDay + 1;
        if (startDay > daysInLastMonth) {
            startDay -= 7;
        }

        if (dayOfWeek === this.locale.firstDay) {
            startDay = daysInLastMonth - 6;
        }

        let curDate = moment([lastYear, lastMonth, startDay, 12, minute, second]);

        for (let i = 0, col = 0, row = 0; i < 42; i++, col++, curDate = moment(curDate).add(24, 'hour')) {
            if (i > 0 && col % 7 === 0) {
                col = 0;
                row++;
            }
            calendar[row][col] = curDate.clone().hour(hour).minute(minute).second(second);
            curDate.hour(12);

            if (this.minDate && calendar[row][col].format('YYYY-MM-DD') === this.minDate.format('YYYY-MM-DD') &&
            calendar[row][col].isBefore(this.minDate) && side === 'left') {
                calendar[row][col] = this.minDate.clone();
            }

            if (this.maxDate && calendar[row][col].format('YYYY-MM-DD') === this.maxDate.format('YYYY-MM-DD') &&
            calendar[row][col].isAfter(this.maxDate) && side === 'right') {
                calendar[row][col] = this.maxDate.clone();
            }
        }

        // make the calendar object available to hoverDate/clickDate
        if (side === SideEnum.left) {
            this.leftCalendar.calendar = calendar;
        } else {
            this.rightCalendar.calendar = calendar;
        }
        //
        // Display the calendar
        //
        const minDate = side === 'left' ? this.minDate : this.startDate;
        let maxDate = this.maxDate;
        // adjust maxDate to reflect the dateLimit setting in order to
        // grey out end dates beyond the dateLimit
        if (this.endDate === null && this.dateLimit) {
            const maxLimit = this.startDate.clone().add(this.dateLimit, 'day').endOf('day');
                if (!maxDate || maxLimit.isBefore(maxDate)) {
                maxDate = maxLimit;
            }
        }
        this.calendarVariables[side] = {
            month: month,
            year: year,
            hour: hour,
            minute: minute,
            second: second,
            daysInMonth: daysInMonth,
            firstDay: firstDay,
            lastDay: lastDay,
            lastMonth: lastMonth,
            lastYear: lastYear,
            daysInLastMonth: daysInLastMonth,
            dayOfWeek: dayOfWeek,
            // other vars
            calRows: Array.from(Array(6).keys()),
            calCols: Array.from(Array(7).keys()),
            classes: {},
            minDate: minDate,
            maxDate: maxDate,
            calendar: calendar
        };
        if (this.showDropdowns) {
            const currentMonth = calendar[1][1].month();
            const currentYear = calendar[1][1].year();
            const realCurrentYear = moment().year();
            const maxYear = (maxDate && maxDate.year()) || (realCurrentYear + 5);
            const minYear = (minDate && minDate.year()) || (realCurrentYear - 50);
            const inMinYear = currentYear === minYear;
            const inMaxYear = currentYear === maxYear;
            const years = [];
            for (let y = minYear; y <= maxYear; y++) {
                years.push(y);
            }
            this.calendarVariables[side].dropdowns = {
                currentMonth: currentMonth,
                currentYear: currentYear,
                maxYear: maxYear,
                minYear: minYear,
                inMinYear: inMinYear,
                inMaxYear: inMaxYear,
                monthArrays: Array.from(Array(12).keys()),
                yearArrays: years
            };
        }

        this._buildCells(calendar, side);
    }
    setStartDate(startDate) {
        if (typeof startDate === 'string') {
            this.startDate = moment(startDate, this.locale.format);
        }

        if (typeof startDate === 'object') {
            this.pickingDate = true;
            this.startDate = moment(startDate);
        }
        if (!this.timePicker) {
            this.pickingDate = true;
            this.startDate = this.startDate.startOf('day');
        }

        if (this.timePicker && this.timePickerIncrement) {
            this.startDate.minute(Math.round(this.startDate.minute() / this.timePickerIncrement) * this.timePickerIncrement);
        }


        if (this.minDate && this.startDate.isBefore(this.minDate)) {
            this.startDate = this.minDate.clone();
            if (this.timePicker && this.timePickerIncrement) {
                this.startDate.minute(Math.round(this.startDate.minute() / this.timePickerIncrement) * this.timePickerIncrement);
            }

        }

        if (this.maxDate && this.startDate.isAfter(this.maxDate)) {
            this.startDate = this.maxDate.clone();
            if (this.timePicker && this.timePickerIncrement) {
                this.startDate.minute(Math.floor(this.startDate.minute() / this.timePickerIncrement) * this.timePickerIncrement);
            }
        }

        if (!this.isShown) {
            this.updateElement();
        }
        this.startDateChanged.emit({startDate: this.startDate});
        this.updateMonthsInView();
    }

    setEndDate(endDate) {
        if (typeof endDate === 'string') {
            this.endDate = moment(endDate, this.locale.format);
        }

        if (typeof endDate === 'object') {
            this.pickingDate = false;
            this.endDate = moment(endDate);
        }
        if (!this.timePicker) {
            this.pickingDate = false;
            this.endDate = this.endDate.add(1, 'd').startOf('day').subtract(1, 'second');
        }

        if (this.timePicker && this.timePickerIncrement) {
            this.endDate.minute(Math.round(this.endDate.minute() / this.timePickerIncrement) * this.timePickerIncrement);
        }


        if (this.endDate.isBefore(this.startDate)) {
            this.endDate = this.startDate.clone();
        }

        if (this.maxDate && this.endDate.isAfter(this.maxDate)) {
            this.endDate = this.maxDate.clone();
        }

        if (this.dateLimit && this.startDate.clone().add(this.dateLimit, 'day').isBefore(this.endDate)) {
            this.endDate = this.startDate.clone().add(this.dateLimit, 'day');
        }


        if (!this.isShown) {
            // this.updateElement();
        }
        this.endDateChanged.emit({endDate: this.endDate});
        this.updateMonthsInView();
    }
    @Input()
    isInvalidDate(date) {
        return false;
    }
    @Input()
    isCustomDate(date) {
        return false;
    }
    @Input()
    isTooltipDate(date): string {
        return null;
    }

    updateView() {
        if (this.timePicker) {
            this.renderTimePicker(SideEnum.left);
            this.renderTimePicker(SideEnum.right);
        }
        this.updateMonthsInView();
        this.updateCalendars();
    }

    updateMonthsInView() {
        if (this.endDate) {
            // if both dates are visible already, do nothing
            if (!this.singleDatePicker && this.leftCalendar.month && this.rightCalendar.month &&
                ((this.startDate && this.leftCalendar && this.startDate.format('YYYY-MM') === this.leftCalendar.month.format('YYYY-MM')) ||
                (this.startDate && this.rightCalendar && this.startDate.format('YYYY-MM') === this.rightCalendar.month.format('YYYY-MM')))
                &&
                (this.endDate.format('YYYY-MM') === this.leftCalendar.month.format('YYYY-MM') ||
                this.endDate.format('YYYY-MM') === this.rightCalendar.month.format('YYYY-MM'))
                ) {
                return;
            }
            if (this.startDate) {
                this.leftCalendar.month = this.startDate.clone().date(2);
                if (!this.linkedCalendars && (this.endDate.month() !== this.startDate.month() ||
                    this.endDate.year() !== this.startDate.year())) {
                    this.rightCalendar.month = this.endDate.clone().date(2);
                } else {
                        this.rightCalendar.month = this.startDate.clone().date(2).add(1, 'month');
                }
            }

        } else {
            if (this.leftCalendar.month.format('YYYY-MM') !== this.startDate.format('YYYY-MM') &&
            this.rightCalendar.month.format('YYYY-MM') !== this.startDate.format('YYYY-MM')) {
                this.leftCalendar.month = this.startDate.clone().date(2);
                this.rightCalendar.month = this.startDate.clone().date(2).add(1, 'month');
            }
        }
        if (this.maxDate && this.linkedCalendars && !this.singleDatePicker && this.rightCalendar.month > this.maxDate) {
            this.rightCalendar.month = this.maxDate.clone().date(2);
            this.leftCalendar.month = this.maxDate.clone().date(2).subtract(1, 'month');
        }
    }
    /**
     *  This is responsible for updating the calendars
     */
    updateCalendars() {
        this.renderCalendar(SideEnum.left);
        this.renderCalendar(SideEnum.right);

        if (this.endDate === null) { return; }
        this.calculateChosenLabel();
    }
    updateElement() {
        const format = this.locale.displayFormat ? this.locale.displayFormat : this.locale.format;
        if (!this.singleDatePicker && this.autoUpdateInput) {
            if (this.startDate && this.endDate) {
                // if we use ranges and should show range label on input
                if (this.rangesArray.length && this.showRangeLabelOnInput === true && this.chosenRange &&
                    this.locale.customRangeLabel !== this.chosenRange) {
                    this.chosenLabel = this.chosenRange;
                } else {
                    this.chosenLabel = this.startDate.format(format) +
                    this.locale.separator + this.endDate.format(format);
                }
            }
        } else if ( this.autoUpdateInput) {
            this.chosenLabel = this.startDate.format(format);
        }
    }

    remove() {
        this.isShown = false;
    }
    /**
     * this should calculate the label
     */
    calculateChosenLabel () {
        if (!this.locale || !this.locale.separator) {
            this._buildLocale();
        }
        let customRange = true;
        let i = 0;
        if (this.rangesArray.length > 0) {
            for (const range in this.ranges) {
                if (this.ranges[range]) {
                    if (this.timePicker) {
                        const format = this.timePickerSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm';
                        // ignore times when comparing dates if time picker seconds is not enabled
                      if (this.startDate.format(format) === this.ranges[range][0].format(format)
                        && this.endDate.format(format) === this.ranges[range][1].format(format)) {
                            customRange = false;
                            this.chosenRange = this.rangesArray[i];
                            break;
                        }
                    } else {
                        // ignore times when comparing dates if time picker is not enabled
                        if (this.startDate.format('YYYY-MM-DD') === this.ranges[range][0].format('YYYY-MM-DD')
                          && this.endDate.format('YYYY-MM-DD') === this.ranges[range][1].format('YYYY-MM-DD')) {
                            customRange = false;
                            this.chosenRange = this.rangesArray[i];
                            break;
                        }
                    }
                    i++;
                }
            }
            if (customRange) {
                if (this.showCustomRangeLabel) {
                    this.chosenRange = this.locale.customRangeLabel;
                } else {
                    this.chosenRange = null;
                }
                // if custom label: show calendar
                this.showCalInRanges = true;
            }
        }

        this.updateElement();
    }

    clickApply(e?) {
        this.announce('Date range applied');
        if (!this.singleDatePicker && this.startDate && !this.endDate) {
            this.endDate = this._getDateWithTime(this.startDate, SideEnum.right);

            this.calculateChosenLabel();
        }
        if (this.isInvalidDate && this.startDate && this.endDate) {
            // get if there are invalid date between range
            const d = this.startDate.clone();
            while (d.isBefore(this.endDate)) {
                if (this.isInvalidDate(d)) {
                    this.endDate = d.subtract(1, 'days');
                    this.calculateChosenLabel();
                    break;
                }
                d.add(1, 'days');
            }
        }
        if (this.chosenLabel) {
            this.choosedDate.emit({chosenLabel: this.chosenLabel, startDate: this.startDate, endDate: this.endDate});
        }

        this.datesUpdated.emit({startDate: this.startDate, endDate: this.endDate});
        if (e || (this.closeOnAutoApply && !e)) {
          this.hide();
        }
    }

    clickCancel(e) {
        this.announce('Selection cancelled');
        this.startDate = this._old.start;
        this.endDate = this._old.end;
        if (this.inline) {
            this.updateView();
        }
        this.hide();
    }
    /**
     * called when month is changed
     * @param monthEvent get value in event.target.value
     * @param side left or right
     */
    monthChanged(monthEvent: any, side: SideEnum) {
        const year = this.calendarVariables[side].dropdowns.currentYear;
        const month = parseInt(monthEvent.target.value, 10);
        this.monthOrYearChanged(month, year, side);
    }
    /**
     * called when year is changed
     * @param yearEvent get value in event.target.value
     * @param side left or right
     */
    yearChanged(yearEvent: any, side: SideEnum) {
        const month = this.calendarVariables[side].dropdowns.currentMonth;
        const year = parseInt(yearEvent.target.value, 10);
        this.monthOrYearChanged(month, year, side);
    }
    /**
     * called when time is changed
     * @param timeEvent  an event
     * @param side left or right
     */
    timeChanged(timeEvent: any, side: SideEnum) {
        let hour = parseInt(this.timepickerVariables[side].selectedHour, 10);
        const minute = parseInt(this.timepickerVariables[side].selectedMinute, 10);
        const second = this.timePickerSeconds ? parseInt(this.timepickerVariables[side].selectedSecond, 10) : 0;

        if (!this.timePicker24Hour) {
            const ampm = this.timepickerVariables[side].ampmModel;
            if (ampm === 'PM' && hour < 12) {
                hour += 12;
            }
            if (ampm === 'AM' && hour === 12) {
                hour = 0;
            }
        }

        if (side === SideEnum.left) {
            const start = this.startDate.clone();
            start.hour(hour);
            start.minute(minute);
            start.second(second);
            this.setStartDate(start);
            if (this.singleDatePicker) {
                this.endDate = this.startDate.clone();
            } else if (this.endDate && this.endDate.format('YYYY-MM-DD') === start.format('YYYY-MM-DD') && this.endDate.isBefore(start)) {
                this.setEndDate(start.clone());
            } else if(!this.endDate && this.timePicker){
                const startClone = this._getDateWithTime(start, SideEnum.right);
                
                if(startClone.isBefore(start)){
                    this.timepickerVariables[SideEnum.right].selectedHour = hour;
                    this.timepickerVariables[SideEnum.right].selectedMinute = minute;
                    this.timepickerVariables[SideEnum.right].selectedSecond = second;
                }
            }
        } else if (this.endDate) {
            const end = this.endDate.clone();
            end.hour(hour);
            end.minute(minute);
            end.second(second);
            this.setEndDate(end);
        }

        // update the calendars so all clickable dates reflect the new time component
        this.updateCalendars();

        // re-render the time pickers because changing one selection can affect what's enabled in another
        this.renderTimePicker(SideEnum.left);
        this.renderTimePicker(SideEnum.right);

        if (this.autoApply) {
          this.clickApply();
        }
    }
    /**
     *  call when month or year changed
     * @param month month number 0 -11
     * @param year year eg: 1995
     * @param side left or right
     */
    monthOrYearChanged(month: number, year: number, side: SideEnum) {
        const isLeft = side === SideEnum.left;

        if (!isLeft) {
            if (year < this.startDate.year() || (year === this.startDate.year() && month < this.startDate.month())) {
                month = this.startDate.month();
                year = this.startDate.year();
            }
        }

        if (this.minDate) {
            if (year < this.minDate.year() || (year === this.minDate.year() && month < this.minDate.month())) {
                month = this.minDate.month();
                year = this.minDate.year();
            }
        }

        if (this.maxDate) {
            if (year > this.maxDate.year() || (year === this.maxDate.year() && month > this.maxDate.month())) {
                month = this.maxDate.month();
                year = this.maxDate.year();
            }
        }
        this.calendarVariables[side].dropdowns.currentYear = year;
        this.calendarVariables[side].dropdowns.currentMonth = month;
        if (isLeft) {
            this.leftCalendar.month.month(month).year(year);
            if (this.linkedCalendars) {
                this.rightCalendar.month = this.leftCalendar.month.clone().add(1, 'month');
            }
        } else {
            this.rightCalendar.month.month(month).year(year);
            if (this.linkedCalendars) {
                this.leftCalendar.month = this.rightCalendar.month.clone().subtract(1, 'month');
            }
        }
        this.updateCalendars();
    }

    /**
     * Click on previous month
     * @param side left or right calendar
     */
    clickPrev(side: SideEnum) {
        if (side === SideEnum.left) {
            this.leftCalendar.month.subtract(1, 'month');
            if (this.linkedCalendars) {
                this.rightCalendar.month.subtract(1, 'month');
            }
        } else {
            this.rightCalendar.month.subtract(1, 'month');
        }
        this.updateCalendars();
    }
    /**
     * Click on next month
     * @param side left or right calendar
     */
    clickNext(side: SideEnum) {
        if (side === SideEnum.left) {
            this.leftCalendar.month.add(1, 'month');
        } else {
            this.rightCalendar.month.add(1, 'month');
            if (this.linkedCalendars) {
                this.leftCalendar.month.add(1, 'month');
            }
        }
        this.updateCalendars();
    }

    /**
     * When hovering a date
     * @param e event: get value by e.target.value
     * @param side left or right
     * @param row row position of the current date clicked
     * @param col col position of the current date clicked
     */
    hoverDate(e, side: SideEnum, row: number, col: number) {
      const leftCalDate = this.calendarVariables.left.calendar[row][col];
      const rightCalDate = this.calendarVariables.right.calendar[row][col];
      if (this.pickingDate) {
        this.nowHoveredDate = side === SideEnum.left ? leftCalDate : rightCalDate;
        this.renderCalendar(SideEnum.left);
        this.renderCalendar(SideEnum.right);
      }
      const tooltip = side === SideEnum.left ? this.tooltiptext[leftCalDate] : this.tooltiptext[rightCalDate];
          if (tooltip.length > 0) {
            e.target.setAttribute('title', tooltip);
          }
    }
    /**
     * When selecting a date
     * @param e event: get value by e.target.value
     * @param side left or right
     * @param row row position of the current date clicked
     * @param col col position of the current date clicked
     */
    clickDate(e, side: SideEnum, row: number, col: number) {
        if (e.target.tagName === 'TD') {
            if (!e.target.classList.contains('available')) {
                return;
            }
        } else if (e.target.tagName === 'SPAN') {
            if (!e.target.parentElement.classList.contains('available')) {
                return;
            }
        }
        if (this.rangesArray.length) {
            this.chosenRange = this.locale.customRangeLabel;
        }

        let date = side ===  SideEnum.left ? this.leftCalendar.calendar[row][col] : this.rightCalendar.calendar[row][col];

        if ((this.endDate || (date.isBefore(this.startDate, 'day')
          && this.customRangeDirection === false) ) && this.lockStartDate === false) { // picking start
            if (this.timePicker) {
                date = this._getDateWithTime(date, SideEnum.left);
            }
            this.endDate = null;
            this.setStartDate(date.clone());
        }  else if (!this.endDate && date.isBefore(this.startDate) && this.customRangeDirection === false) {
            // special case: clicking the same date for start/end,
            // but the time of the end date is before the start date
            this.setEndDate(this.startDate.clone());
        } else { // picking end
            if (this.timePicker) {
                date = this._getDateWithTime(date, SideEnum.right);
            }
            if (date.isBefore(this.startDate, 'day') === true && this.customRangeDirection === true) {
                this.setEndDate(this.startDate);
                this.setStartDate(date.clone());
            } else {
                this.setEndDate(date.clone());
            }

            if (this.autoApply) {
                this.calculateChosenLabel();
            }
        }

        if (this.singleDatePicker) {
            this.setEndDate(this.startDate);
            this.updateElement();
            if (this.autoApply) {
                this.clickApply();
            }
        }

        this.updateView();

        if (this.autoApply && this.startDate && this.endDate) {
          this.clickApply();
        }

        // Announce selection changes
        if (this.startDate && !this.endDate) {
            this.announce(`Start date selected ${this.startDate.format(this.locale.format)}`);
        } else if (this.startDate && this.endDate) {
            this.announce(`End date selected ${this.endDate.format(this.locale.format)}`);
        }

        // This is to cancel the blur event handler if the mouse was in one of the inputs
        e.stopPropagation();

    }
    /**
     *  Click on the custom range
     * @param e: Event
     * @param label
     */
    clickRange(e, label) {
        this.chosenRange = label;
        if (label === this.locale.customRangeLabel) {
            this.isShown  = true; // show calendars
            this.showCalInRanges = true;
        } else {
            const dates = this.ranges[label];
            this.startDate = dates[0].clone();
            this.endDate = dates[1].clone();
            if (this.showRangeLabelOnInput && label !== this.locale.customRangeLabel) {
                this.chosenLabel = label;
            } else {
                this.calculateChosenLabel();
            }
            this.showCalInRanges = (!this.rangesArray.length) || this.alwaysShowCalendars;

            if (!this.timePicker) {
                this.startDate.startOf('day');
                this.endDate.endOf('day');
            }

            if (!this.alwaysShowCalendars) {
                this.isShown  = false; // hide calendars
            }
            this.rangeClicked.emit({label: label, dates: dates});
            if (!this.keepCalendarOpeningWithRange || this.autoApply) {
                this.clickApply();
            } else {
                if (!this.alwaysShowCalendars) {
                    return  this.clickApply();
                }
                if (this.maxDate && this.maxDate.isSame(dates[0], 'month')) {
                    this.rightCalendar.month.month(dates[0].month());
                    this.rightCalendar.month.year(dates[0].year());
                    this.leftCalendar.month.month(dates[0].month() - 1);
                    this.leftCalendar.month.year(dates[1].year() );
                } else {
                    this.leftCalendar.month.month(dates[0].month());
                    this.leftCalendar.month.year(dates[0].year());
                    // get the next year
                    const nextMonth = dates[0].clone().add(1, 'month');
                    this.rightCalendar.month.month(nextMonth.month());
                    this.rightCalendar.month.year(nextMonth.year() );
                }
                this.updateCalendars();
                if (this.timePicker) {
                    this.renderTimePicker(SideEnum.left);
                    this.renderTimePicker(SideEnum.right);
                }
            }

        }
    }



    show(e?) {
        if (this.isShown) { return; }
        this._old.start = this.startDate.clone();
        // Remember element that opened the dialog to restore focus later
        this._previousFocus = (document.activeElement as HTMLElement) ?? null;
        this.isShown = true;
        this.updateView();

        // After calendar is rendered, move focus to the selected start day for better keyboard UX
        setTimeout(() => {
            this.focusSelectedStartDateCell();
            this.toggleFocusTrapAnchors(true);
        });
    }

    /**
     * Puts keyboard focus on the cell that represents the currently selected start date.
     * Works only when popup mode (not inline).
     */
    private focusSelectedStartDateCell(): void {
        if (this.inline) {
            return; // don't steal focus in inline mode
        }

        const tryFocus = (side: SideEnum): boolean => {
            const calVars = this.calendarVariables?.[side];
            if (!calVars || !calVars.calendar) {
                return false;
            }
            for (const rowIdx of calVars.calRows) {
                for (const colIdx of calVars.calCols) {
                    const cellDate = calVars.calendar[rowIdx][colIdx];
                    if (cellDate && this.startDate && cellDate.isSame(this.startDate, 'day')) {
                        const selector = `[data-side="${side}"][data-row="${rowIdx}"][data-col="${colIdx}"]`;
                        const cell: HTMLElement | null = this.pickerContainer?.nativeElement.querySelector(selector);
                        if (cell) {
                            cell.focus();
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        // Prefer left calendar, then right
        if (!tryFocus(SideEnum.left)) {
            tryFocus(SideEnum.right);
        }
    }

    hide(e?) {
        if (!this.isShown) {
            return;
        }
        // incomplete date selection, revert to last values
        if (!this.endDate) {
            if (this._old.start) {
                this.startDate = this._old.start.clone();
            }
            if (this._old.end) {
                this.endDate = this._old.end.clone();
            }
        }

        // if a new date range was selected, invoke the user callback function
        if (this.startDate && this._old.start && this.endDate && this._old.end &&
            (!this.startDate.isSame(this._old.start) || !this.endDate.isSame(this._old.end))) {
           // this.callback(this.startDate, this.endDate, this.chosenLabel);
        }

        // if picker is attached to a text input, update it
        this.updateElement();
        this.isShown = false;
        this._ref.detectChanges();

        // Restore focus to initiator
        if (this._previousFocus) {
            this._previousFocus.focus();
            this._previousFocus = null;
        }

        // disable anchors
        this.toggleFocusTrapAnchors(false);
    }

    /**
     * handle click on all element in the component, useful for outside of click
     * @param e event
     */
    handleInternalClick(e) {
        e.stopPropagation();
    }
    /**
     * update the locale options
     * @param locale
     */
    updateLocale(locale) {
        for (const key in locale) {
          if (locale.hasOwnProperty(key)) {
            this.locale[key] = locale[key];
            if (key === 'customRangeLabel') {
                this.renderRanges();
            }
          }
        }
    }
    /**
     *  clear the daterange picker
     */
    clear() {
        this.startDate = moment().startOf('day');
        this.endDate = moment().endOf('day');
        this.choosedDate.emit({chosenLabel: '', startDate: null, endDate: null});
        this.datesUpdated.emit({startDate: null, endDate: null});
        this.hide();
    }

    /**
     * Find out if the selected range should be disabled if it doesn't
     * fit into minDate and maxDate limitations.
     */
    disableRange(range) {
      if (range === this.locale.customRangeLabel) {
        return false;
      }
      const rangeMarkers = this.ranges[range];
      const areBothBefore = rangeMarkers.every( date => {
        if (!this.minDate) {
            return false;
        }
        return date.isBefore(this.minDate);
      });

      const areBothAfter = rangeMarkers.every( date => {
        if (!this.maxDate) {
            return false;
        }
        return date.isAfter(this.maxDate);
      });
      return (areBothBefore || areBothAfter);
    }
    /**
     *
     * @param date the date to add time
     * @param side left or right
     */
    private _getDateWithTime(date, side: SideEnum): _moment.Moment {
        let hour = parseInt(this.timepickerVariables[side].selectedHour, 10);
        if (!this.timePicker24Hour) {
            const ampm = this.timepickerVariables[side].ampmModel;
            if (ampm === 'PM' && hour < 12) {
                hour += 12;
            }
            if (ampm === 'AM' && hour === 12) {
                hour = 0;
            }
        }
        const minute = parseInt(this.timepickerVariables[side].selectedMinute, 10);
        const second = this.timePickerSeconds ? parseInt(this.timepickerVariables[side].selectedSecond, 10) : 0;
        return date.clone().hour(hour).minute(minute).second(second);
    }
    /**
     *  build the locale config
     */
    private _buildLocale() {
        this.locale = {...this._localeService.config, ...this.locale};
         if (!this.locale.format) {
            if (this.timePicker) {
                this.locale.format = moment.localeData().longDateFormat('lll');
            } else {
                this.locale.format = moment.localeData().longDateFormat('L');
            }
        }
    }
    private _buildCells(calendar, side: SideEnum) {
        for (let row = 0; row < 6; row++) {
            this.calendarVariables[side].classes[row] = {};
            const rowClasses = [];
            if (
                this.emptyWeekRowClass &&
                Array.from(Array(7).keys()).some(i => calendar[row][i].month() !== this.calendarVariables[side].month)
            ) {
                rowClasses.push(this.emptyWeekRowClass);
            }
            for (let col = 0; col < 7; col++) {
                const classes = [];
                // empty week row class
                if (this.emptyWeekColumnClass) {
                    if (calendar[row][col].month() !== this.calendarVariables[side].month) {
                        classes.push(this.emptyWeekColumnClass);
                    }
                }
                // highlight today's date
                if (calendar[row][col].isSame(new Date(), 'day')) {
                    classes.push('today');
                }
                // highlight weekends
                if (calendar[row][col].isoWeekday() > 5) {
                    classes.push('weekend');
                }
                // grey out the dates in other months displayed at beginning and end of this calendar
                if (calendar[row][col].month() !== calendar[1][1].month()) {
                    classes.push('off');

                    // mark the last day of the previous month in this calendar
                    if (
                        this.lastDayOfPreviousMonthClass && (calendar[row][col].month() < calendar[1][1].month() ||
                        calendar[1][1].month() === 0) && calendar[row][col].date() === this.calendarVariables[side].daysInLastMonth
                    ) {
                        classes.push(this.lastDayOfPreviousMonthClass);
                    }

                    // mark the first day of the next month in this calendar
                    if (
                        this.firstDayOfNextMonthClass && (calendar[row][col].month() > calendar[1][1].month() ||
                        calendar[row][col].month() === 0) && calendar[row][col].date() === 1
                    ) {
                        classes.push(this.firstDayOfNextMonthClass);
                    }
                }
                // mark the first day of the current month with a custom class
                if (
                    this.firstMonthDayClass && calendar[row][col].month() === calendar[1][1].month() &&
                    calendar[row][col].date() === calendar.firstDay.date()
                ) {
                    classes.push(this.firstMonthDayClass);
                }
                // mark the last day of the current month with a custom class
                if (
                    this.lastMonthDayClass && calendar[row][col].month() === calendar[1][1].month() &&
                calendar[row][col].date() === calendar.lastDay.date()) {
                    classes.push(this.lastMonthDayClass);
                }
                // don't allow selection of dates before the minimum date
                if (this.minDate && calendar[row][col].isBefore(this.minDate, 'day')) {
                    classes.push('off', 'disabled');
                }
                // don't allow selection of dates after the maximum date
                if (this.calendarVariables[side].maxDate && calendar[row][col].isAfter(this.calendarVariables[side].maxDate, 'day')) {
                    classes.push('off', 'disabled');
                }
                // don't allow selection of date if a custom function decides it's invalid
                if (this.isInvalidDate(calendar[row][col])) {
                    classes.push('off', 'disabled', 'invalid');
                }
                // highlight the currently selected start date
                if (this.startDate && calendar[row][col].format('YYYY-MM-DD') === this.startDate.format('YYYY-MM-DD')) {
                    classes.push('active', 'start-date');
                }
                // highlight the currently selected end date
                if (this.endDate != null && calendar[row][col].format('YYYY-MM-DD') === this.endDate.format('YYYY-MM-DD')) {
                    classes.push('active', 'end-date');
                }
                // highlight dates in-between the selected dates
                if (
                      (
                        (this.nowHoveredDate != null && this.pickingDate) || this.endDate != null
                      ) &&
                      (
                        calendar[row][col] > this.startDate &&
                        (
                          calendar[row][col] < this.endDate || (calendar[row][col] < this.nowHoveredDate && this.pickingDate)
                        )
                      ) &&
                      (
                        !classes.find(el => el === 'off')
                      )
                ) {
                    classes.push('in-range');
                }
                // apply custom classes for this date
                const isCustom = this.isCustomDate(calendar[row][col]);
                if (isCustom !== false) {
                    if (typeof isCustom === 'string') {
                        classes.push(isCustom);
                    } else {
                        Array.prototype.push.apply(classes, isCustom);
                    }
                }
                // apply custom tooltip for this date
                const isTooltip = this.isTooltipDate(calendar[row][col]);
                if (isTooltip) {
                    if (typeof isTooltip === 'string') {
                        this.tooltiptext[calendar[row][col]] = isTooltip; // setting tooltiptext for custom date
                    } else {
                        this.tooltiptext[calendar[row][col]] = 'Put the tooltip as the returned value of isTooltipDate';
                    }
                } else {
                  this.tooltiptext[calendar[row][col]] = '';
                }
                // store classes var
                let cname = '', disabled = false;
                for (let i = 0; i < classes.length; i++) {
                    cname += classes[i] + ' ';
                    if (classes[i] === 'disabled') {
                        disabled = true;
                    }
                }
                if (!disabled) {
                    cname += 'available';
                }
                this.calendarVariables[side].classes[row][col] = cname.replace(/^\s+|\s+$/g, '');
            }
            this.calendarVariables[side].classes[row].classList = rowClasses.join(' ');
        }
    }

    /**
     * Determines whether the calendar cell at the provided position should be marked as selected
     * for accessibility purposes. A cell is considered selected if it has either the 'active'
     * or 'in-range' class applied by the calendar rendering logic.
     */
    isAriaSelected(side: SideEnum, row: number, col: number): boolean {
        const sideVars = this.calendarVariables?.[side];
        if (!sideVars || !sideVars.classes || !sideVars.classes[row] || !sideVars.classes[row][col]) {
            return false;
        }
        const cls: string = sideVars.classes[row][col] as string;
        return cls.includes('active') || cls.includes('in-range');
    }

    /**
     * Determines tabindex for a calendar cell – only start & end (or single active) dates
     * get 0 so they are reachable via TAB, rest are -1.
     */
    getTabIndex(side: SideEnum, row: number, col: number): number {
        const date = this.calendarVariables?.[side]?.calendar?.[row]?.[col];
        if (!date) {
            return -1;
        }
        if (this.startDate && date.isSame(this.startDate, 'day')) {
            return 0;
        }
        if (this.endDate && date.isSame(this.endDate, 'day')) {
            return 0;
        }
        // In single date mode, endDate is same as startDate; above covers.
        if (!this.isShown && !this.inline) {
            return -1;
        }
        return -1;
    }

    /**
     * Keyboard navigation handler for an individual calendar cell.
     * Supports arrow keys, page up/down, ctrl+arrow and enter to select a day.
     */
    handleDayKeydown(event: KeyboardEvent, side: SideEnum, row: number, col: number): void {
        const key = event.key;

        // Global shortcuts to close the picker
        if ((event.altKey && key === 'ArrowUp') || key === 'Escape') {
            event.preventDefault();
            this.hide();
            return;
        }

        const currentDate = this.calendarVariables[side].calendar[row][col].clone();
        let targetDate: _moment.Moment | null = null;

        switch (key) {
            case 'ArrowLeft':
                event.preventDefault();
                if (event.ctrlKey) {
                    this.clickPrev(side);
                    targetDate = currentDate.clone().subtract(1, 'month');
                } else {
                    targetDate = currentDate.clone().subtract(1, 'day');
                }
                break;
            case 'ArrowRight':
                event.preventDefault();
                if (event.ctrlKey) {
                    this.clickNext(side);
                    targetDate = currentDate.clone().add(1, 'month');
                } else {
                    targetDate = currentDate.clone().add(1, 'day');
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                targetDate = currentDate.clone().subtract(7, 'day');
                break;
            case 'ArrowDown':
                event.preventDefault();
                targetDate = currentDate.clone().add(7, 'day');
                break;
            case 'PageUp':
                event.preventDefault();
                this.clickPrev(side);
                targetDate = currentDate.clone().subtract(1, 'month');
                break;
            case 'PageDown':
                event.preventDefault();
                this.clickNext(side);
                targetDate = currentDate.clone().add(1, 'month');
                break;
            case 'Enter':
            case ' ': // space
                event.preventDefault();
                this.clickDate(event, side, row, col);
                return;
            default:
                return;
        }

        if (targetDate) {
            this.moveFocusToDate(targetDate);
        }
    }

    /**
     * Ensures the provided date is visible (updates calendars if necessary) and focuses its cell.
     */
    private moveFocusToDate(date: _moment.Moment): void {
        // Bring date into view if outside current months.
        const makeVisible = (): void => {
            let adjusted = false;
            // If date is before left calendar month
            while (date.isBefore(this.leftCalendar.month, 'month')) {
                this.clickPrev(SideEnum.left);
                adjusted = true;
            }
            // If date is after right calendar month (or left in single)
            while (date.isAfter(this.rightCalendar.month.clone().endOf('month'), 'day')) {
                this.clickNext(SideEnum.right);
                adjusted = true;
            }
            if (adjusted) {
                // allow DOM to update
                setTimeout(() => this.focusDateCellIfVisible(date));
            } else {
                this.focusDateCellIfVisible(date);
            }
        };

        makeVisible();
    }

    /** Focuses the cell for the date if it exists in DOM */
    private focusDateCellIfVisible(date: _moment.Moment): void {
        const sides = [SideEnum.left, SideEnum.right];
        for (const s of sides) {
            const calVars = this.calendarVariables?.[s];
            if (!calVars) continue;
            for (const r of calVars.calRows) {
                for (const c of calVars.calCols) {
                    const cellDate = calVars.calendar[r][c];
                    if (cellDate && cellDate.isSame(date, 'day')) {
                        const selector = `[data-side="${s}"][data-row="${r}"][data-col="${c}"]`;
                        const cell: HTMLElement | null = this.pickerContainer?.nativeElement.querySelector(selector);
                        if (cell) {
                            cell.focus();
                            return;
                        }
                    }
                }
            }
        }
    }

    /** Enable or disable focus-trap anchor elements to keep them out of tab order when hidden */
    private toggleFocusTrapAnchors(enable: boolean): void {
        const anchors: NodeListOf<HTMLElement> = this.el.nativeElement.querySelectorAll('.cdk-focus-trap-anchor');
        anchors.forEach(a => {
            a.tabIndex = enable ? 0 : -1;
            a.setAttribute('aria-hidden', enable ? 'false' : 'true');
        });
    }

    // Close the picker when Escape is pressed while popup is open
    @HostListener('keydown.escape', ['$event'])
    onEsc(event: KeyboardEvent): void {
        if (this.isShown && !this.inline) {
            event.preventDefault();
            this.hide();
        }
    }
}
