package ws

import (
	"encoding/json"
	"fmt"
	"net/http"
	"rentroll/rlib"
	"time"
)

//-------------------------------------------------------------------
//                        **** SEARCH ****
//-------------------------------------------------------------------

// SearchTask is the definition of a task. It is used to make instance
// which become Tasks
type SearchTask struct {
	Recid       int64             `json:"recid"` //
	TID         int64             //
	BID         int64             //
	TLID        int64             // the TaskList to which this task belongs
	Name        string            `json:"TaskName"` // Task text
	Worker      string            // Name of the associated work function
	DtDue       rlib.JSONDateTime // Task Due Date
	DtPreDue    rlib.JSONDateTime // Pre Completion due date
	DtDone      rlib.JSONDateTime // Task completion Date
	DtPreDone   rlib.JSONDateTime // Task Pre Completion Date
	FLAGS       int64             // special circumstance indicators
	DoneUID     int64             // user who marked task as done
	PreDoneUID  int64             // user who marked task as predone
	Comment     string            `json:"TaskComment"` // any user comments
	LastModTime rlib.JSONDateTime // when was this record last written
	LastModBy   int64             // employee UID (from phonebook) that modified it
	CreateTS    rlib.JSONDateTime // when was this record created
	CreateBy    int64             // employee UID (from phonebook) that created it
}

// SearchTaskResponse holds the task list definition list
type SearchTaskResponse struct {
	Status  string       `json:"status"`
	Total   int          `json:"total"`
	Records []SearchTask `json:"records"`
}

//-------------------------------------------------------------------
//                         **** SAVE ****
//-------------------------------------------------------------------

// FormSaveTask holds the task definition for a task form
type FormSaveTask struct {
	Recid        int64 `json:"recid"`
	TID          int64
	BID          int64
	TLID         int64             // the TaskList to which this task belongs
	Name         string            `json:"TaskName"` // Task text
	Worker       string            // Name of the associated work function
	DtDue        rlib.JSONDateTime // Task Due Date
	DtPreDue     rlib.JSONDateTime // Pre Completion due date
	DtDone       rlib.JSONDateTime // Task completion Date
	DtPreDone    rlib.JSONDateTime // Task Pre Completion Date
	ChkDtDue     bool              // enable disable
	ChkDtPreDue  bool              // enable/disable
	ChkDtDone    bool              // actual date/time
	ChkDtPreDone bool              // actual date/time
	FLAGS        int64             // special circumstance indicators
	DoneUID      int64             // user who marked task as done
	PreDoneUID   int64             // user who marked task as predone
	Comment      string            `json:"TaskComment"` // any user comments
}

// SaveTaskInput is the input data format for a Save command
type SaveTaskInput struct {
	Recid    int64        `json:"recid"`
	Status   string       `json:"status"`
	FormName string       `json:"name"`
	Record   FormSaveTask `json:"record"`
}

//-------------------------------------------------------------------
//                         **** GET ****
//-------------------------------------------------------------------

// FormTask holds the task definition for a task form
type FormTask struct {
	Recid           int64 `json:"recid"`
	TID             int64
	BID             int64
	TLID            int64             // the TaskList to which this task belongs
	Name            string            `json:"TaskName"` // Task text
	Worker          string            // Name of the associated work function
	DtDue           rlib.JSONDateTime // Task Due Date
	DtPreDue        rlib.JSONDateTime // Pre Completion due date
	DtDone          rlib.JSONDateTime // Task completion Date
	DtPreDone       rlib.JSONDateTime // Task Pre Completion Date
	ChkDtDue        bool              // enable disable
	ChkDtPreDue     bool              // enable/disable
	ChkDtDone       bool              // actual date/time
	ChkDtPreDone    bool              // actual date/time
	TaskDoneName    string            // name for DoneUID
	TaskPreDoneName string            // name for PreDoneUID
	FLAGS           int64             // special circumstance indicators
	DoneUID         int64             // user who marked task as done
	PreDoneUID      int64             // user who marked task as predone
	Comment         string            `json:"TaskComment"` // any user comments
	LastModTime     rlib.JSONDateTime // when was this record last written
	LastModBy       int64             // employee UID (from phonebook) that modified it
	CreateTS        rlib.JSONDateTime // when was this record created
	CreateBy        int64             // employee UID (from phonebook) that created it
}

// GetTaskResponse is the response to a GetTask request
type GetTaskResponse struct {
	Status string   `json:"status"`
	Record FormTask `json:"record"`
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

// SvcSearchTaskHandler returns the Tasks associated with the supplied
// TLID. This search handler was not implemented like many of the other
// handlers because the only use case we are supporting for Tasks
// is to search for those that belong to a particular Task.
// wsdoc {
//  @Title  Search Tasks
//	@URL /v1/tasks/:BUI/TLID
//  @Method  POST
//	@Synopsis Search Tasks
//  @Description  Search all Tasks associated with the supplied TDID.
//  @Description  This call ignores any limit and simply returns all TDs.
//	@Input wsSearchReq
//  @Response SearchTaskResponse
// wsdoc }
//-----------------------------------------------------------------------------
func SvcSearchTaskHandler(w http.ResponseWriter, r *http.Request, d *ServiceData) {
	funcname := "SvcSearchTaskHandler"
	rlib.Console("Entered %s.  d.ID = %d\n", funcname, d.ID)

	tds, err := rlib.GetTasks(r.Context(), d.ID)
	if err != nil {
		SvcErrorReturn(w, err, funcname)
		return
	}

	rlib.Console("TaskCount = %d\n", len(tds))
	var g SearchTaskResponse
	for i := 0; i < len(tds); i++ {
		var t SearchTask
		rlib.MigrateStructVals(&tds[i], &t)
		t.Recid = int64(i)
		g.Records = append(g.Records, t)
	}
	g.Status = "success"
	g.Total = len(g.Records)
	SvcWriteResponse(d.BID, &g, w)
}

// SvcHandlerTask handles requests to read/write/update or
// make-inactive a specific Task.  It routes the request to
// an appropriate handler
//
// The server command can be:
//      get     - read it
//      save    - Insert or Update
//      delete  - make it inactive
//-----------------------------------------------------------------------------
func SvcHandlerTask(w http.ResponseWriter, r *http.Request, d *ServiceData) {
	const funcname = "SvcHandlerTask"
	var err error

	rlib.Console("Entered %s\n", funcname)
	rlib.Console("Request: %s:  BID = %d,  TDID = %d\n", d.wsSearchReq.Cmd, d.BID, d.ID)

	switch d.wsSearchReq.Cmd {
	case "get":
		if d.ID < 0 {
			err = fmt.Errorf("TaskID is required but was not specified")
			SvcErrorReturn(w, err, funcname)
			return
		}
		getTask(w, r, d)
	case "save":
		saveTask(w, r, d)
	case "delete":
		deleteTask(w, r, d)
	default:
		err := fmt.Errorf("Unhandled command: %s", d.wsSearchReq.Cmd)
		SvcErrorReturn(w, err, funcname)
		return
	}
}

// deleteTask makes the secified Task inactive
// wsdoc {
//  @Title  Delete Task
//	@URL /v1/task/:BUI/TID
//  @Method  POST
//	@Synopsis Delete Task Descriptor TID
//  @Desc  This service deletes the Task with the supplied TDID.
//	@Input DeletePmtForm
//  @Response SvcStatusResponse
// wsdoc }
//-----------------------------------------------------------------------------
func deleteTask(w http.ResponseWriter, r *http.Request, d *ServiceData) {
	const funcname = "deleteTask"
	var del DeletePmtForm

	rlib.Console("Entered %s\n", funcname)
	rlib.Console("record data = %s\n", d.data)

	if err := json.Unmarshal([]byte(d.data), &del); err != nil {
		e := fmt.Errorf("%s: Error with json.Unmarshal:  %s", funcname, err.Error())
		SvcErrorReturn(w, e, funcname)
		return
	}
	err := rlib.DeleteTask(r.Context(), d.ID)
	if err != nil {
		SvcErrorReturn(w, err, funcname)
		return
	}
	SvcWriteSuccessResponse(d.BID, w)
}

// GetTask returns the requested assessment
// wsdoc {
//  @Title  Save Task
//	@URL /v1/task/:BUI/TID
//  @Method  GET
//	@Synopsis Update Task information
//  @Description This service updates Task TID with the
//  @Description information supplied.
//	@Input SaveTaskInput
//  @Response SvcStatusResponse
// wsdoc }
//-----------------------------------------------------------------------------
func saveTask(w http.ResponseWriter, r *http.Request, d *ServiceData) {
	funcname := "saveTask"
	var foo SaveTaskInput
	var err error
	var blank rlib.TaskList
	var now = time.Now()
	var tl rlib.TaskList

	rlib.Console("Entered %s\n", funcname)
	rlib.Console("record data = %s\n", d.data)

	//---------------------------------------------------------------------
	// Create a Task struct based on the supplied info...
	//---------------------------------------------------------------------
	data := []byte(d.data)
	if err := json.Unmarshal(data, &foo); err != nil {
		e := fmt.Errorf("%s: Error with json.Unmarshal:  %s", funcname, err.Error())
		SvcErrorReturn(w, e, funcname)
		return
	}
	var a rlib.Task
	rlib.MigrateStructVals(&foo.Record, &a) // the variables that don't need special handling
	a.Name = foo.Record.Name
	a.BID = d.BID

	//-------------------------------------------------------
	// Bizlogic checks...
	//-------------------------------------------------------
	// e := bizlogic.ValidateTask(r.Context(), &a)
	// if len(e) > 0 {
	// 	SvcErrorReturn(w, bizlogic.BizErrorListToError(e), funcname)
	// 	return
	// }

	//-------------------------------------------------------
	// Insert or update as needed...
	//-------------------------------------------------------
	rlib.Console("a.TID = %d, d.ID = %d\n", a.TID, d.ID)
	if a.TID == 0 && d.ID == 0 {
		//-------------------------------------------------------
		// Chk values dictate the dates.
		//-------------------------------------------------------
		if !foo.Record.ChkDtDue {
			a.DtDue = blank.DtDue
		}
		if !foo.Record.ChkDtPreDue {
			a.DtPreDue = blank.DtPreDue
		}
		if foo.Record.ChkDtPreDone {
			a.DtPreDone = now
		}
		if foo.Record.ChkDtDone {
			a.DtDone = now
		}

		if foo.Record.TLID == 0 {
			e := fmt.Errorf("%s: Could not create Task because TaskList id (%d) does not exist", funcname, foo.Record.TLID)
			SvcErrorReturn(w, e, funcname)
			return
		}
		tl, err = rlib.GetTaskList(r.Context(), foo.Record.TLID)
		if err != nil {
			SvcErrorReturn(w, err, funcname)
			return
		}
		if tl.TLID == 0 {
			e := fmt.Errorf("%s: Could not create TaskList because definition id (%d) does not exist", funcname, foo.Record.TLID)
			SvcErrorReturn(w, e, funcname)
			return
		}
		err = rlib.InsertTask(r.Context(), &a) // This is a new record
	} else {
		// b, err := rlib.GetTask(r.Context(), a.TID)
		// if err != nil {
		// 	SvcErrorReturn(w, err, funcname)
		// 	return
		// }
		//------------------------------------------------------------------
		// Due and PreDue dates are not changable.  If those
		// need to be changed, you'll need to change the definition.
		// If the PreDue date changes from unset to set, record the
		// datetime.  If it changes from set to unset, reset the datetime.
		// Identical operations for Due date.
		//------------------------------------------------------------------
		rlib.Console("SaveTask: A\n")
		if !foo.Record.ChkDtPreDone { // current db DtPreDone is set, but user unset it
			rlib.Console("SaveTask: B\n")
			a.DtPreDone = rlib.TIME0
			a.PreDoneUID = 0
		} else {
			a.DtPreDone = now
			a.PreDoneUID = d.sess.UID
		}
		rlib.Console("SaveTask: C\n")
		if !foo.Record.ChkDtDone { // current db DtPreDone is unset, but user set it
			rlib.Console("SaveTask: D\n")
			a.DtDone = rlib.TIME0
			a.DoneUID = 0
		} else {
			a.DtDone = now
			a.DoneUID = d.sess.UID
		}
		err = rlib.UpdateTask(r.Context(), &a)
	}

	if err != nil {
		e := fmt.Errorf("%s: Error saving Task %s (%d): %s", funcname, a.Name, a.TID, err.Error())
		SvcErrorReturn(w, e, funcname)
		return
	}

	SvcWriteSuccessResponseWithID(d.BID, w, a.TID)
}

// GetTask returns the requested Task
// wsdoc {
//  @Title  Get Task
//	@URL /v1/task/:BUI/TID
//  @Method  GET
//	@Synopsis Get information on a Task
//  @Description  Return all fields for assessment :TID
//	@Input WebGridSearchRequest
//  @Response GetTaskResponse
// wsdoc }
//-----------------------------------------------------------------------------
func getTask(w http.ResponseWriter, r *http.Request, d *ServiceData) {
	const funcname = "getTask"
	var g GetTaskResponse
	var a rlib.Task
	var err error

	rlib.Console("entered %s, getting TID = %d\n", funcname, d.ID)
	a, err = rlib.GetTask(r.Context(), d.ID)
	if err != nil {
		SvcErrorReturn(w, err, funcname)
		return
	}
	if a.TID > 0 {
		var gg FormTask
		rlib.MigrateStructVals(&a, &gg)

		gg.ChkDtDue = a.DtDue.Year() > 1970
		gg.ChkDtPreDue = a.DtPreDue.Year() > 1970
		gg.ChkDtDone = a.DtDone.Year() > 1970
		gg.ChkDtPreDone = a.DtPreDone.Year() > 1970
		if a.DoneUID > 0 {
			gg.TaskDoneName = rlib.GetNameForUID(r.Context(), a.DoneUID)
		}
		if a.PreDoneUID > 0 {
			gg.TaskPreDoneName = rlib.GetNameForUID(r.Context(), a.PreDoneUID)
		}

		gg.Recid = gg.TID
		g.Record = gg
	}
	g.Status = "success"
	SvcWriteResponse(d.BID, &g, w)
}
