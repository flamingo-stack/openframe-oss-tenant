use core::ffi::c_void;

use windows::core::PCWSTR;
use windows::Win32::Foundation::{CloseHandle, HANDLE};
use windows::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
    SetInformationJobObject, TerminateJobObject, JOBOBJECT_BASIC_LIMIT_INFORMATION,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
};
use windows::Win32::System::Threading::{OpenProcess, PROCESS_SET_QUOTA, PROCESS_TERMINATE};

pub(super) struct JobHandle(Option<HANDLE>);

impl JobHandle {
    fn create() -> Option<HANDLE> {
        unsafe {
            let job = CreateJobObjectW(None, PCWSTR::null()).ok()?;
            let info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
                BasicLimitInformation: JOBOBJECT_BASIC_LIMIT_INFORMATION {
                    LimitFlags: JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
                    ..Default::default()
                },
                ..Default::default()
            };
            let _ = SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                &info as *const _ as *const c_void,
                core::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            );
            Some(job)
        }
    }

    pub(super) fn for_pid(pid: u32) -> Self {
        if pid == 0 {
            return JobHandle(None);
        }
        let Some(job) = Self::create() else {
            return JobHandle(None);
        };
        unsafe {
            match OpenProcess(PROCESS_TERMINATE | PROCESS_SET_QUOTA, false, pid) {
                Ok(process) => {
                    let _ = AssignProcessToJobObject(job, process);
                    let _ = CloseHandle(process);
                }
                Err(e) => tracing::warn!(pid, error = %e, "OpenProcess for job assignment failed"),
            }
        }
        JobHandle(Some(job))
    }

    pub(super) fn for_handle(process: HANDLE) -> Self {
        let Some(job) = Self::create() else {
            return JobHandle(None);
        };
        unsafe {
            let _ = AssignProcessToJobObject(job, process);
        }
        JobHandle(Some(job))
    }

    pub(super) fn terminate(&self) {
        if let Some(job) = self.0 {
            unsafe {
                let _ = TerminateJobObject(job, 1);
            }
        }
    }
}

impl Drop for JobHandle {
    fn drop(&mut self) {
        if let Some(job) = self.0 {
            unsafe {
                let _ = CloseHandle(job);
            }
        }
    }
}
